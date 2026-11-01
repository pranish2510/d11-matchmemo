# Architecture

## Overview

D11 is built as a two-layer system:

1. A Python backend that owns deterministic cricket business logic and API contracts.
2. A Next.js frontend that renders dashboard experiences and interactive match surfaces.

MatchMemo sits on top of the same structured state layer and is designed to explain match context rather than calculate outcomes.

## Data flow

- The client fetches backend health and future match state data through the FastAPI API.
- The backend exposes typed endpoints for health, match state, events, and catch-up narratives.
- Python code remains the trusted source for ball-by-ball and statistical logic.
- The frontend consumes feeds and presents them in sports-tech dashboards without owning cricket computation.

## Python vs Gemini separation

Python is responsible for:

- score arithmetic
- overs and run rate calculations
- probability or momentum estimates
- match-state validation
- deterministic replay or simulation logic

Gemini is responsible for:

- narrative summaries
- match recaps
- catch-up and context writing
- explanation of structured payloads

Gemini must never decide or mutate match scoring state directly. It should only consume validated inputs and produce explanatory outputs.

## SQLite storage layout

Initial storage is intentionally lightweight and future-facing:

- `d11.db` will hold match metadata, innings state, events, sessions, and checkpoints.
- Tables will be separated by concern: matches, innings, balls, events, sessions, checkpoints, and maybe AI-generated summaries.
- The initial foundation ensures the backend is ready for this layered approach without introducing the scoring engine yet.
