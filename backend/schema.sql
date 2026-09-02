-- Run this in the Supabase SQL editor before starting the backend.

create extension if not exists vector;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ---------- Auth ----------
create table if not exists profiles (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text, -- nullable: Google-only accounts have no password
    face_embedding jsonb,
    google_id text unique, -- Google's stable per-user "sub" claim, null for password/face-only accounts
    created_at timestamptz default now()
);

-- Safe to re-run on an existing database: relaxes password_hash for
-- deployments created before Google sign-in was added, and is a no-op if
-- the table was just created fresh by the create-table statement above.
alter table profiles alter column password_hash drop not null;
alter table profiles add column if not exists google_id text unique;

-- ---------- Chat ----------
create table if not exists chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    title text default 'New Chat',
    created_at timestamptz default now()
);

create table if not exists chat_history (
    id bigserial primary key,
    session_id uuid references chat_sessions(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    role text not null,
    content text not null,
    created_at timestamptz default now()
);

-- ---------- Documents / RAG ----------
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    filename text not null,
    storage_path text,
    status text default 'processing', -- processing | ready | failed
    created_at timestamptz default now()
);

create table if not exists document_chunks (
    id bigserial primary key,
    document_id uuid references documents(id) on delete cascade,
    user_id uuid references profiles(id) on delete cascade,
    chunk_index int not null,
    content text not null,
    embedding vector(768), -- must match EMBEDDING_DIMENSIONS in app/services/rag/embeddings.py
    created_at timestamptz default now()
);

create index if not exists document_chunks_embedding_idx
    on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Vector similarity search used by /documents/{id}/ask
create or replace function match_document_chunks(
    query_embedding vector(768),
    match_document_id uuid,
    match_user_id uuid,
    match_count int default 5
)
returns table (
    id bigint,
    content text,
    chunk_index int,
    similarity float
)
language sql stable
as $$
    select
        document_chunks.id,
        document_chunks.content,
        document_chunks.chunk_index,
        1 - (document_chunks.embedding <=> query_embedding) as similarity
    from document_chunks
    where document_chunks.document_id = match_document_id
      and document_chunks.user_id = match_user_id
    order by document_chunks.embedding <=> query_embedding
    limit match_count;
$$;

-- Vector similarity search across ALL of a user's ready documents, used by
-- /chat to ground general conversation in the user's document library (as
-- opposed to match_document_chunks, which is scoped to one document for the
-- /documents/{id}/ask flow).
create or replace function match_chunks_for_user(
    query_embedding vector(768),
    match_user_id uuid,
    match_count int default 5
)
returns table (
    id bigint,
    document_id uuid,
    content text,
    chunk_index int,
    similarity float
)
language sql stable
as $$
    select
        document_chunks.id,
        document_chunks.document_id,
        document_chunks.content,
        document_chunks.chunk_index,
        1 - (document_chunks.embedding <=> query_embedding) as similarity
    from document_chunks
    join documents on documents.id = document_chunks.document_id
    where document_chunks.user_id = match_user_id
      and documents.status = 'ready'
    order by document_chunks.embedding <=> query_embedding
    limit match_count;
$$;

-- Note: this schema assumes the backend connects with the Supabase
-- service_role key (bypasses RLS). If you switch to the anon key later,
-- you'll need RLS policies scoping every table to auth.uid() = user_id.

-- Also create a private Storage bucket named "documents" in the Supabase
-- dashboard (Storage -> New bucket) before hitting /documents/upload.

-- ---------- Long-term memory ----------
create table if not exists long_term_memories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    content text not null,
    embedding vector(768),
    created_at timestamptz default now()
);

create index if not exists long_term_memories_embedding_idx
    on long_term_memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Vector similarity search used by app/services/memory/retrieval.py
create or replace function match_long_term_memories(
    query_embedding vector(768),
    match_user_id uuid,
    match_count int default 5
)
returns table (
    id uuid,
    content text,
    similarity float
)
language sql stable
as $$
    select
        long_term_memories.id,
        long_term_memories.content,
        1 - (long_term_memories.embedding <=> query_embedding) as similarity
    from long_term_memories
    where long_term_memories.user_id = match_user_id
    order by long_term_memories.embedding <=> query_embedding
    limit match_count;
$$;
