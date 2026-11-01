# API contracts

This document outlines the planned public REST surface for D11.

## Health

- `GET /health`
- Returns the API status and version metadata.

## Matches

- `GET /matches`
  - List available matches.
- `GET /matches/{id}/state`
  - Return the current state of a specific match.
- `GET /matches/{id}/events`
  - Return ball-by-ball or event-driven updates.

## Simulation and analytics

- `POST /matches/{id}/simulation/start`
- `POST /matches/{id}/simulation/step`
- `POST /matches/{id}/simulation/reset`
- `GET /matches/{id}/momentum`

## MatchMemo catch-up

- `GET /matches/{id}/catchup`
  - Summarize what has happened since the user last checked.
- `POST /matches/{id}/ask`
  - Ask a context-aware question about the current match.

## Sessions and checkpoints

- `POST /sessions/checkpoint`
  - Save a user or analyst checkpoint for a match session.

## Route design principle

The API will keep scoring and simulation endpoints explicit and versioned. The frontend shell is designed to accommodate this structure without depending on the scoring engine being implemented yet.
