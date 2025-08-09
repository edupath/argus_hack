# GPT5-Hackathon – AI Admissions Counselor

Full-stack AI-driven admissions counseling and university application evaluation platform.

## Stack
- Frontend: Next.js (App Router) + Tailwind CSS + shadcn/ui
- Backend: NestJS (Express adapter)
- Database: Firebase Firestore
- Auth: Firebase Authentication (email/password)
- AI: OpenAI GPT-5 via ai SDK function calling
- Vector search: In-memory similarity over seeded catalog (50 programs)
- Web search: Google Custom Search (optional)

## Apps
- `web/`: Next.js frontend
- `server/`: NestJS API
- `shared/`: Shared types and utilities

## Quickstart

1) Prereqs
- Node.js 20+
- Firebase project + service account key (Admin SDK JSON)

2) Clone env templates

```
cp server/.env.example server/.env
cp web/.env.example web/.env.local
```

3) Set env vars
- `server/.env`:
  - FIREBASE_PROJECT_ID
  - FIREBASE_CLIENT_EMAIL
  - FIREBASE_PRIVATE_KEY (escape newlines: replace \n with real newlines)
  - openai_provider=openai
  - openai_model_name=gpt-5.0
  - openai_api_key=...
  - GOOGLE_CSE_ID=... (optional for web search)
  - GOOGLE_API_KEY=... (optional for web search)

- `web/.env.local`:
  - NEXT_PUBLIC_FIREBASE_API_KEY
  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
  - NEXT_PUBLIC_FIREBASE_APP_ID
  - NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:3001

4) Install deps
```
cd server && npm i
cd ../web && npm i
```

5) Run
```
# terminal 1
cd server && npm run start:dev

# terminal 2
cd web && npm run dev
```

Frontend: http://localhost:3000
API: http://localhost:3001/api

## Features
- Generic Counseling Mode: conversational shortlisting with web enrichment
- University Application Mode: collects profile + transcript, asks up to 5 targeted questions, then generates staff-facing evaluation summary only
- Stores profiles, chats, applications, evaluations in Firestore

## Notes
- Theme colors follow: #00693e, #12312b, #0D1E1C, #ffffff, #000000
- No student-facing evaluation or statement is generated

