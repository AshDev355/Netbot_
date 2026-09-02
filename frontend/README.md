# netbot — frontend

Next.js implementation of the netbot design: grounded RAG chat with face unlock
and two-way voice, wired to the FastAPI backend in `../backend`.

## Getting started

```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL if the backend isn't on localhost:8000
npm install
npm run dev
```

Make sure the backend (`cd ../backend && uvicorn app.main:app --reload`) is
running first -- the frontend has no mock-data fallback anymore, so signup,
chat, and everything else require a live backend.

The app runs at http://localhost:3000.

## Scripts

| Script              | What it does                          |
| -------------------- | -------------------------------------- |
| `npm run dev`       | Dev server with hot reload            |
| `npm run build`     | Production build                      |
| `npm run start`     | Serve the production build            |
| `npm run typecheck` | Type-check without emitting           |

## Routes

| Route               | Screen                                                          |
| -------------------- | ----------------------------------------------------------------- |
| `/`                 | Landing / intro animation, redirects to `/signin`                |
| `/signin`           | Split-screen sign in -- real password login or Face ID           |
| `/signup`           | Two-step signup: account details, then real face capture         |
| `/chat`             | Workspace: real sessions, messages, RAG sources, document upload |
| `/settings/profile` | Real account info, face re-enrollment, account deletion          |

## Structure

```
src/
├── app/                    # App Router routes
├── components/
│   ├── chat/               # Sidebar, message list, composer, sources rail
│   ├── screens/            # One component per full screen
│   ├── FaceCamera.tsx      # Camera preview + real frame capture (ref-based)
│   ├── BrowserFrame.tsx
│   ├── NetsolLogo.tsx
│   ├── SiteFooter.tsx
│   ├── ThemeToggle.tsx
│   ├── TopNav.tsx
│   └── Wordmark.tsx
├── lib/
│   ├── api.ts               # Fetch client for every backend endpoint
│   ├── auth-context.tsx     # Real JWT auth (signup/login/face-login/re-enroll/delete)
│   ├── data.ts               # Shared UI types + static option lists (no mock content)
│   ├── theme.tsx             # Theme context and no-flash boot script
│   └── useSpeech.ts          # Dictation and read-aloud hooks (Web Speech API)
└── styles/                  # Design tokens and per-area stylesheets
```

## Theming

Light and dark are driven by CSS custom properties on `:root[data-theme]`.
An inline script in the root layout applies the stored or system-preferred theme
before first paint, so there is no flash of the wrong palette. The choice
persists in `localStorage`.

## Voice

The composer microphone uses the Web Speech API for dictation, and answers can
be read back with speech synthesis -- entirely client-side, no round trip to
the backend's Whisper/gTTS endpoints (those exist in `lib/api.ts` --
`transcribeAudio` / `synthesizeSpeech` -- for other clients or if you'd rather
route audio through the server).

## Backend wiring

Every screen calls the real backend through `src/lib/api.ts`:
- **Auth**: `/auth/signup` (with a real captured face frame), `/auth/login`,
  `/auth/face-login`, `/auth/re-enroll-face`, `/auth/me` (delete)
- **Sessions**: `/sessions` CRUD + `/sessions/{id}/messages`
- **Chat**: `/chat/` -- responses are grounded in the user's uploaded
  documents automatically (see the sources rail) plus long-term memory and
  tool calls (calculator, web search)
- **Documents**: `/documents/upload` (from the composer's attach button),
  `/documents/`

The JWT is kept in `sessionStorage` (not `localStorage`), so signing out of
one tab doesn't silently persist across a new session, and it's cleared on
logout or account deletion.
