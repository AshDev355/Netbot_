# 🤖 NetBot

**A full-stack AI chatbot.** Sign in with your face, your password, or Google — then chat with an assistant that remembers you, reads your documents, searches the web, and talks back out loud.

```
FastAPI + Supabase (Postgres/pgvector) + Gemini   ·   Next.js + React
```

---

## ✨ What it does

| | |
|---|---|
| 🔐 **Auth, three ways** | Email/password, face recognition, or "Continue with Google" — all issuing the same JWT |
| 🧠 **Actually remembers you** | Session memory for the conversation, plus vector-based long-term memory that surfaces relevant facts later |
| 📄 **RAG over your files** | Upload PDF, DOCX, TXT, or MD — NetBot grounds its answers in them and reranks retrieved chunks for relevance |
| 🛠️ **Tool calling** | Calculator and live web search, wired into the model's function-calling loop |
| 🎙️ **Voice in, voice out** | Speak your message, hear the reply — browser speech recognition + synthesis |
| 🛡️ **Safety pipeline** | Topic guardrails on top of Gemini's built-in safety filters |
| 🗂️ **Full session control** | Create, rename, and delete chat sessions, manage uploaded documents, manage stored memories |

## 🏗️ How it's built

```
netbot/
├── backend/     FastAPI · Supabase (Postgres + pgvector) · Gemini
└── frontend/    Next.js · React
```

**Backend** — FastAPI serves the API and talks to Supabase for storage/auth data and Postgres+pgvector for embeddings. Gemini powers chat, RAG embeddings, and tool calling. Face recognition runs on DeepFace, voice transcription on Whisper, and speech output through gTTS.

**Frontend** — Next.js app with a chat UI, face-camera enrollment flow, and Google's official sign-in button (no lookalikes — stays within Google's branding terms).

**Auth flow** — however you sign in, you land on the same JWT-based session. Google sign-in is verified server-side against Google's public keys (the backend never trusts the frontend's word for who signed in), and it'll auto-link to an existing password/face account if the verified email matches.

---

## Your face is your password

No, really — NetBot can log you in by *looking at you*. Enroll once through the browser camera, and from then on your face unlocks your account. No password to forget, no "reset link sent to your email," just you, a webcam, and a `deepface` embedding doing the recognizing.

Under the hood: the enrollment flow captures a frame, DeepFace turns it into a face embedding, and that embedding gets stored against your profile. On future sign-ins, a fresh frame gets compared against it, and if it's close enough, you're in. It sits right alongside password and Google auth as a third way into the same JWT-based session — mix and match however you like, or re-enroll your face at any time from settings if you get a haircut and start doubting yourself.

---

## 🚀 Getting started

### Backend

```bash
cd backend
cp .env.example .env      # fill in Supabase, Gemini, and JWT values
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Before first run:
1. Run `schema.sql` in the Supabase SQL editor.
2. Create a **private** Storage bucket named `documents` in the Supabase dashboard.
3. Install `ffmpeg` on the host (Whisper needs it).

```bash
uvicorn app.main:app --reload
```

<details>
<summary><strong>Optional: enable "Continue with Google"</strong></summary>

1. Create an OAuth Web Client ID at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).
2. Add your frontend origin (e.g. `http://localhost:3000`) under **Authorized JavaScript origins**.
3. Set `GOOGLE_CLIENT_ID` in `backend/.env` and the same value as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local`.

Leave both unset and the Google button just doesn't render — everything else works exactly as before.
</details>

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev
```

---

## ⚙️ Optional configuration

| Variable | Purpose |
|---|---|
| `SEARCH_API_KEY` | Enables the web-search tool (get a free key at [serper.dev](https://serper.dev)) |
| `FRONTEND_ORIGIN` | Your deployed frontend URL, for CORS in production |
| `DOC_GROUNDING_MIN_SIMILARITY` / `MAX_TOOL_ROUNDS` | Tune RAG and tool-calling behavior without touching code |

---

## 🩹 Notable fixes along the way

NetBot's had a few rounds of hardening — the highlights:

- **Kept pace with Google's deprecations** — migrated off a shut-down embedding model (`text-embedding-004` → `gemini-embedding-001`, with correct L2 normalization for non-default dimensions) and off a soon-to-sunset chat model (`gemini-2.5-flash` → `gemini-3.7-flash`), with the model name centralized to a single config line for next time.
- **Sign in with Google**, verified server-side, with automatic account linking by verified email — plus a nullable `password_hash` for Google-only accounts.
- **Hardened the chat loop** — tool errors no longer crash a request, unrecognized DB roles no longer break the Gemini call, duplicate route handlers removed.
- **Rate limiting** on all unauthenticated auth endpoints so face-login can't be hammered.
- **Better memory & RAG** — long-term memory triggers now match anywhere in a message (not just the start), and a keyword-overlap reranker replaced a pass-through stub.
- **Sessions persist across browser restarts** (`sessionStorage` → `localStorage`).

The full changelog with file-by-file detail lives in [`netbot-final/README.md`](netbot-final/README.md).

## 🔭 Known limitations

- `web_search` requires a `SEARCH_API_KEY`.
- The RAG reranker is keyword-overlap only — a cross-encoder would do better in production.
- No CI pipeline yet.
- Deleting an account doesn't yet clean up its files in Supabase Storage.

---

<p align="center"><sub>Built with FastAPI, Next.js, Supabase, and Gemini.</sub></p>
