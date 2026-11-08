# D11 MatchMemo: Instant AI Match Catch-Up & Fantasy Impact Engine 🏏

Live Production Demo: https://d11-matchmemo.vercel.app/

Built as a Forward Deployed Engineering (FDE) showcase, MatchMemo is a high-scale, zero-hallucination AI catch-up engine designed to solve a massive fan engagement problem in live sports and scoring applications.

## 🎯 The Fan Problem

During high-voltage T20 matches, millions of fans and fantasy players step away for 10–15 minutes due to commutes, work, or calls. Returning to a static scorecard (135/3 in 11.3 overs) shows what the score is, but fails to capture the story of what happened—where the momentum shifted, which key matchups unfolded, or how those missed deliveries impacted their active fantasy team points.

## 🏗️ System Architecture (Hybrid "Math + AI" Engine)

To guarantee zero mathematical hallucinations and 100% uptime during traffic spikes, MatchMemo decouples Deterministic State Math from Generative Narrative Synthesis:

Deterministic Ball-by-Ball Engine (TypeScript / Python):

Computes exact run/wicket deltas, boundary counts, turning points, and official Dream11 T20 Fantasy Points (+1/run, +25/wicket, +8/bowled, etc.) across the user's exact [offline_ball -> current_ball] window in <1ms.

Generative Narrator (Same-Origin Next.js Route + Groq API):

Injects the deterministic "ground truth" telemetry into a strict LLM system prompt.

Dynamically discovers available LLMs (routing across Qwen, Llama-3, Allam, Gemma) and generates broadcast-grade bilingual recaps (English & Hindi) without making up stats.

0ms Chaos Failover:

If the external LLM API times out or hits a 429/503 outage, the system instantly bypasses the AI and serves the deterministic template directly to the UI without crashing.

## 🚀 FDE Showcase Features

⚡ Return Catch-Up: Simulates user presence (GO OFFLINE / BACK ONLINE) to generate precise 15s Quick & 30s Detailed match summaries.

🏆 Fantasy Points Delta: Real-time leaderboard showing which players generated the most points during the missed window, featuring interactive 1X Base, 1.5X VC, and 2X Captain multiplier toggles.

📈 Overlapping Worm Graph & Full Scorecard: SVG timeline plotting Run trajectories and Wickets (Innings 1 vs Innings 2 overlap), plus a complete Ball-1-to-Current-Ball scorecard for both innings.

🛠️ FDE Telemetry Inspector: Live observability dashboard exposing pipeline latency, active model routing, and structured JSON context payloads. Includes a Simulate LLM Outage toggle for chaos testing.

## 🛡️ Security & Abuse Protections

Production-grade guardrails implemented at the API route level:

In-Memory Rate Limiting: Restricts endpoints to 12 req/min per IP to prevent quota exhaustion.

Pre-LLM Lexical Guardrails: Instantly drops requests matching off-topic topics or prompt injection signatures ("ignore previous", "system prompt", "recipe").

Post-LLM System Constraints: Strict bounds enforcing AI to only discuss the IND vs AUS match and the 22 squad players.

Server-Side Key Isolation: GROQ_API_KEY is strictly resolved on the server. No NEXT_PUBLIC_ exposure, preventing DevTools scraping.

## 💻 Tech Stack

Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS

Backend: FastAPI (Python), Uvicorn, httpx, Pydantic

AI / Inference: Groq Cloud REST API (Llama-3, Qwen)

Deployment: Vercel (Frontend & Serverless API), Render (FastAPI)

## ⚙️ Local Development Setup
1. Start the FastAPI Backend
```bash
cd backend
python -m venv venv
source ve/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
2. Start the Next.js Frontend
```bash
cd frontend
npm install
# Create a .env file in the frontend folder and add:
# GROQ_API_KEY=your_groq_api_key_here
npm run dev
```
The app will be running at `http://localhost:3000`. The Next.js API route will automatically route AI requests using your local environment variables and proxy to the FastAPI backend if needed.
