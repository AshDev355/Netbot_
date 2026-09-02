"""Lightweight domain dataclasses, NOT a SQLAlchemy ORM layer.

The backend talks to Postgres exclusively through the supabase-py client
(see app/services/supabase.py), which returns plain dicts from every query.
Introducing SQLAlchemy on top would mean maintaining two separate, possibly
drifting definitions of the same tables (SQLAlchemy models vs schema.sql)
for one Postgres database -- not worth the duplication for this project's
size. These dataclasses exist for type hints and IDE support when passing
records between services, not as the source of truth (schema.sql is)."""

from dataclasses import dataclass


@dataclass
class User:
    id: str
    email: str
    password_hash: str
    face_embedding: str | None = None
    created_at: str | None = None
