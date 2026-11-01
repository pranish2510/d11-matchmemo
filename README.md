# D11 + MatchMemo

D11 is a cricket-first live scoring platform designed around the principle: "Every ball matters." MatchMemo complements the platform with an AI-assisted catch-up experience: "Never miss the story of a match."

## Tech stack

- Backend: Python, FastAPI, Pydantic, SQLite-ready foundation
- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- AI narrative: Gemini-powered post-match and live summary layer, kept separate from deterministic scoring logic

## Local setup

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
python -m pytest
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Environment variables

Copy the example file and adjust values as needed:

```bash
cp .env.example .env
```

The default backend API URL for the frontend is `http://localhost:8000`.

## Current milestone

This repository is currently in Day 1 — Task 1: Project Foundation.

The current implementation includes:

- backend health checks
- monorepo directory structure
- Next.js dashboard shell
- dark-mode sports-tech UI styling
- documentation and architecture placeholders

The cricket scoring engine, simulation logic, and Gemini integration remain intentionally deferred to later tasks.
