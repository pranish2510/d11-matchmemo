# AGENTS.md

## Working rules for this repository

- This repo is for D11, a cricket-first live scoring platform with MatchMemo AI summaries.
- Python code is the source of truth for all cricket math, innings state, probability logic, and deterministic scoring rules.
- Gemini and any AI model integration are limited to explaining, summarizing, or transforming structured payloads. They must never be used to invent match state, score logic, or player statistics.
- All request and response payloads must use strict Pydantic models and typed schemas.
- Keep the backend and frontend cleanly separated by responsibility. Prefer thin HTTP routes and domain logic located in backend services.
- Do not implement cricket simulation engines, score logic, or database models beyond the requested foundation in Day 1.
- Do not add speculative features or broad scope without explicit task instructions.
- Keep secrets out of source control. Use `.env` files locally and the `.env.example` template as the public reference.
- Deliver the requested work completely and avoid "extra" inventions that are not required by the task.
- The legal-delivery rule: ship only what is asked for in the current task, with no hidden or accidental scope creep.

## Architecture guardrails

- Deterministic calculations must live in Python services, not the frontend or Gemini prompts.
- Gemini can only explain a structured match payload or produce narrative copy from a validated state object.
- SQLite is the default local persistence layer for the initial foundation. Keep storage concerns isolated from API route logic.
- UI work should remain a polished shell and dashboard foundation, not a fake scoring simulation.
