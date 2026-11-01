from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.models.database import (
    get_ball_events,
    get_match_row,
    initialize_database,
    list_matches,
    set_checkpoint,
    update_match_state,
)
from app.schemas.health import HealthResponse
from app.schemas.match import (
    BallEvent,
    CatchUpRequest,
    MatchAdvanceRequest,
    MatchMemoPayload,
    MatchPresenceRequest,
    MatchSimulationInitRequest,
    MatchSimulationStepRequest,
    MatchStateResponse,
)
from app.services.scoring_engine import get_match_state

router = APIRouter()

initialize_database()


def _event_for_id(match_id: str, event_id: int) -> BallEvent | None:
    rows = get_ball_events(match_id, from_event_id=event_id, to_event_id=event_id)
    if not rows:
        return None
    return BallEvent.model_validate(rows[0])


def _safe_time_bucket_from_event(match_id: str, event_id: int) -> tuple[int, int]:
    event = _event_for_id(match_id, event_id)
    if event is None:
        return 1, 1
    return event.innings, event.over_number


def _compute_missing_slice(match_id: str, from_event_id: int, to_event_id: int) -> list[BallEvent]:
    all_events = [BallEvent.model_validate(row) for row in get_ball_events(match_id)]
    return [event for event in all_events if from_event_id <= event.event_id <= to_event_id]


def _generate_match_memo_fallback(language: str, events: list[BallEvent]) -> MatchMemoPayload:
    runs = sum(event.total_runs for event in events)
    wickets = sum(1 for event in events if event.is_wicket)
    boundaries = sum(1 for event in events if event.is_boundary_four or event.is_boundary_six)
    dots = sum(1 for event in events if event.total_runs == 0 and event.is_legal_delivery)
    high = max(events, key=lambda e: e.total_runs, default=events[0] if events else BallEvent.model_validate({
        "event_id": 1, "match_id": "ind-aus-thriller", "innings": 1, "over_number": 0, "ball_in_over": 1, "over_label": "1.1", "batter": "Rohit Sharma", "non_striker": "Virat Kohli", "bowler": "Arshdeep Singh", "batter_runs": 0, "extra_type": None, "extra_runs": 0, "total_runs": 0, "is_legal_delivery": True, "is_boundary_four": False, "is_boundary_six": False, "is_wicket": False, "dismissal_type": None, "player_out": None, "fielder": None, "commentary": "Ball"}))
    if language == "hi":
        return MatchMemoPayload(
            language="hi",
            quick_recap=f"{runs} रन, {wickets} विकेट, {boundaries} सीमाएं — मैच की धार अब बदल गई है।",
            detailed_recap=f"यह सीरीज में दिलचस्प मोड़ है: {events[0].batter if events else 'बल्लेबाज'} ने आक्रामक शुरुआत की, फिर {high.batter} ने निर्णायक शॉट खेले। {dots} डॉट गेंदें थकीं, जबकि {runs} रन और {wickets} विकेट्स ने खेल का रुख बदला।",
            turning_point=f"मुख्य मोड़: {high.batter} का बड़ा शॉट और विकेटों का झरना, जिससे टीम ने मुकाबला अपने पक्ष में किया।",
            momentum_analysis=f"मोमेंटम {('अब टीम के पक्ष में है' if runs >= 12 else 'अभी चुनौतीपूर्ण है')} और रन-रेट लगातार प्रभावी रहा।",
            watch_next="अगला फोकस: मजबूत खत्म और बड़े शॉट्स पर नियंत्रण।",
        )
    return MatchMemoPayload(
        language="en",
        quick_recap=f"{runs} runs, {wickets} wickets, {boundaries} boundaries — the match shifted decisively in this burst.",
        detailed_recap=f"The key phase featured aggressive intent with {dots} dot balls and a decisive mix of pressure and intent. {high.batter} maximized the momentum with a standout intervention and the run flow stayed active.",
        turning_point=f"Turning point: the breakthrough came when {high.batter} broke the rhythm and changed the tempo with a high-impact sequence.",
        momentum_analysis=f"Momentum is {'tilting in favor of the batting side' if runs >= 12 else 'still fragile'} and the run rate remained sharp through the phase.",
        watch_next="Watch next: keep the strike rotating and avoid losing the next key wicket early.",
    )


async def _maybe_generate_match_memo(match_id: str, from_event_id: int, to_event_id: int, language: str) -> MatchMemoPayload:
    events = _compute_missing_slice(match_id, from_event_id, to_event_id)
    if not events:
        return _generate_match_memo_fallback(language, [])
    fallback = _generate_match_memo_fallback(language, events)
    key = settings.GEMINI_API_KEY.strip()
    if not key:
        return fallback
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key,
                json={
                    "contents": [{
                        "parts": [{
                            "text": (
                                f"You are generating a cricket MatchMemo for {match_id}. "
                                f"Use only this ball-by-ball slice: {json.dumps([event.model_dump() for event in events], default=str)[:4000]}. "
                                f"Return JSON with keys quick_recap, detailed_recap, turning_point, momentum_analysis, watch_next. "
                                f"Language must be {language}."
                            )
                        }]
                    }],
                    "generationConfig": {"temperature": 0.3},
                },
            )
            if response.status_code != 200:
                return fallback
            payload = response.json()
            text = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not text:
                return fallback
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.strip("`\n ")
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:].strip()
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                return fallback
            return MatchMemoPayload(
                language=language,
                quick_recap=str(parsed.get("quick_recap", fallback.quick_recap)),
                detailed_recap=str(parsed.get("detailed_recap", fallback.detailed_recap)),
                turning_point=str(parsed.get("turning_point", fallback.turning_point)),
                momentum_analysis=str(parsed.get("momentum_analysis", fallback.momentum_analysis)),
                watch_next=str(parsed.get("watch_next", fallback.watch_next)),
            )
    except Exception:
        return fallback


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="d11-backend",
        version=settings.APP_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
        ai_configured=bool(settings.GEMINI_API_KEY),
    )


@router.get("/matches")
def list_match_records() -> list[dict[str, Any]]:
    return list_matches()


@router.get("/matches/{match_id}")
def get_match(match_id: str) -> dict[str, Any]:
    row = get_match_row(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return dict(row)


@router.get("/matches/{match_id}/state", response_model=MatchStateResponse)
def get_state(match_id: str) -> MatchStateResponse:
    return get_match_state(match_id)


@router.get("/matches/{match_id}/events")
def get_filtered_events(
    match_id: str,
    from_event_id: int = Query(1, ge=1),
    to_event_id: int | None = Query(None),
    filter: str = Query("all"),
) -> list[dict[str, Any]]:
    events = get_ball_events(match_id, from_event_id=from_event_id, to_event_id=to_event_id)
    filtered = []
    for row in events:
        event = BallEvent.model_validate(row)
        if filter == "wickets" and not event.is_wicket:
            continue
        if filter == "boundaries" and not (event.is_boundary_four or event.is_boundary_six):
            continue
        filtered.append(event.model_dump())
    return filtered


@router.get("/matches/{match_id}/Catalog")
def get_catalog(match_id: str) -> dict[str, Any]:
    rows = [BallEvent.model_validate(row) for row in get_ball_events(match_id)]
    innings = {"innings_1": {"team": "IND", "overs": 20, "from_event_id": 1, "to_event_id": 120}, "innings_2": {"team": "AUS", "overs": 20, "from_event_id": 121, "to_event_id": 240}}
    summaries = []
    for innings_id in (1, 2):
        innings_events = [event for event in rows if event.innings == innings_id]
        for over_index in range(20):
            over_events = [event for event in innings_events if event.over_number == over_index]
            if not over_events:
                continue
            summaries.append({
                "innings": innings_id,
                "over_number": over_index + 1,
                "start_event_id": min(e.event_id for e in over_events),
                "end_event_id": max(e.event_id for e in over_events),
                "score_after_over": sum(e.total_runs for e in innings_events if e.event_id <= max(ev.event_id for ev in over_events)),
                "key_highlight": "Wicket in the over" if any(e.is_wicket for e in over_events) else ("Boundary burst" if any(e.is_boundary_four or e.is_boundary_six for e in over_events) else "Steady scoring"),
            })
    return {"match_id": match_id, "innings": innings, "over_summaries": summaries}


@router.get("/matches/{match_id}/overs")
def get_overs(match_id: str) -> dict[str, Any]:
    return get_catalog(match_id)


@router.post("/matches/{match_id}/simulation/init")
def init_simulation(match_id: str, request: MatchSimulationInitRequest) -> MatchStateResponse:
    row = get_match_row(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Match not found")
    event_offset = 0 if request.innings == 1 else 120
    target_event_id = event_offset + (request.start_over * 6) + 1
    update_match_state(match_id, target_event_id, current_innings=request.innings, user_status="online", offline_checkpoint_event_id=None, offline_started_at=None)
    return get_match_state(match_id)


@router.post("/matches/{match_id}/simulation/step")
def step_simulation(match_id: str, request: MatchSimulationStepRequest) -> MatchStateResponse:
    row = get_match_row(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Match not found")
    current_event_id = int(row["current_event_id"])
    total_events = len(get_ball_events(match_id))
    if request.direction == "next_ball":
        next_event = min(total_events, current_event_id + 1)
        update_match_state(match_id, next_event)
    elif request.direction == "prev_ball":
        next_event = max(1, current_event_id - 1)
        update_match_state(match_id, next_event)
    elif request.direction == "next_over":
        next_event = min(total_events, current_event_id + 6)
        update_match_state(match_id, next_event)
    else:
        raise HTTPException(status_code=400, detail="Unsupported simulation step")
    return get_match_state(match_id)


@router.post("/matches/{match_id}/presence")
async def set_presence(match_id: str, request: MatchPresenceRequest) -> dict[str, Any]:
    row = get_match_row(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Match not found")
    state = get_match_state(match_id)
    if request.status == "offline":
        update_match_state(match_id, int(state.current_event_id), user_status="offline", offline_checkpoint_event_id=state.current_event_id, offline_started_at=datetime.now(timezone.utc).isoformat())
        state = get_match_state(match_id)
        return {"state": state.model_dump(), "match_memo": None}

    checkpoint = int(row["offline_checkpoint_event_id"] or state.current_event_id)
    if request.status == "online":
        if checkpoint is None:
            checkpoint = state.current_event_id
        current = int(state.current_event_id)
        missed = _compute_missing_slice(match_id, checkpoint, current)
        if checkpoint <= current:
            memo = await _maybe_generate_match_memo(match_id, checkpoint, current, request.language)
        else:
            memo = _generate_match_memo_fallback(request.language, [])
        update_match_state(match_id, current, user_status="online")
        state = get_match_state(match_id)
        return {"state": state.model_dump(), "match_memo": memo.model_dump()}

    raise HTTPException(status_code=400, detail="Unsupported presence status")


@router.post("/matches/{match_id}/catchup")
async def generate_catchup(match_id: str, request: CatchUpRequest) -> dict[str, Any]:
    if request.to_event_id < request.from_event_id:
        raise HTTPException(status_code=400, detail="to_event_id must be >= from_event_id")
    events = _compute_missing_slice(match_id, request.from_event_id, request.to_event_id)
    summary = {
        "runs_added": sum(event.total_runs for event in events),
        "wickets_fallen": sum(1 for event in events if event.is_wicket),
        "boundaries_hit": sum(1 for event in events if event.is_boundary_four or event.is_boundary_six),
        "dot_balls": sum(1 for event in events if event.is_legal_delivery and event.total_runs == 0),
        "run_rate_shift": round((sum(event.total_runs for event in events) / max(len(events), 1)) * 6, 2),
    }
    memo = await _maybe_generate_match_memo(match_id, request.from_event_id, request.to_event_id, request.language)
    return {"events": [event.model_dump() for event in events], "summary": summary, "match_memo": memo.model_dump()}


@router.post("/matches/{match_id}/simulation/start")
def start_simulation(match_id: str) -> MatchStateResponse:
    row = get_match_row(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Match not found")
    update_match_state(match_id, int(row["current_event_id"]), True)
    return get_match_state(match_id)


@router.post("/matches/{match_id}/simulation/pause")
def pause_simulation(match_id: str) -> MatchStateResponse:
    row = get_match_row(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Match not found")
    update_match_state(match_id, int(row["current_event_id"]), False)
    return get_match_state(match_id)


@router.post("/matches/{match_id}/simulation/advance")
def advance_simulation(match_id: str, request: MatchAdvanceRequest) -> dict[str, Any]:
    row = get_match_row(match_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Match not found")

    current_event_id = int(row["current_event_id"])
    total_events = len(get_ball_events(match_id))
    result: dict[str, Any] = {"step": request.step, "current_event_id": current_event_id}

    if request.step == "ball":
        current_event_id = min(total_events, current_event_id + 1)
        update_match_state(match_id, current_event_id)
    elif request.step == "over":
        current_event_id = min(total_events, current_event_id + 6)
        update_match_state(match_id, current_event_id)
    elif request.step == "reset_checkpoint":
        current_event_id = 70
        update_match_state(match_id, current_event_id)
        set_checkpoint("demo-session", match_id, 70)
    elif request.step == "collapse_demo":
        current_event_id = 98
        update_match_state(match_id, current_event_id)
        set_checkpoint("demo-session", match_id, 70)
        result["missed_events"] = 28
    elif request.step == "reset_start":
        current_event_id = 6
        update_match_state(match_id, current_event_id)
    else:
        raise HTTPException(status_code=400, detail="Unsupported simulation step")

    result["current_event_id"] = current_event_id
    result["state"] = get_match_state(match_id).model_dump()
    return result

# ============================================================================
# GEMINI AI GUARDRAILED Q&A ENDPOINT FOR MATCHMEMO
# ============================================================================
import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class AskMatchMemoAIRequest(BaseModel):
    question: str
    language: str = "en"
    match_context: str = ""

ALLOWED_CRICKET_KEYWORDS = [
    # Match & Cricket terms
    "india", "australia", "ind", "aus", "match", "score", "over", "wicket", "run",
    "boundary", "four", "six", "ball", "pitch", "chase", "target", "innings", "crr",
    "rrr", "momentum", "partnership", "powerplay", "death", "spin", "pace", "yorker",
    "bouncer", "slower", "catch", "lbw", "bowled", "starc", "cummins", "hazlewood",
    "zampa", "stoinis", "head", "travis", "warner", "marsh", "maxwell", "david",
    "wade", "rohit", "sharma", "kohli", "virat", "pant", "rishabh", "surya", "sky",
    "yadav", "dube", "shivam", "hardik", "pandya", "jadeja", "axar", "patel",
    "kuldeep", "bumrah", "jasprit", "arshdeep", "singh", "career", "stats", "average",
    "strike rate", "century", "fifty", "world cup", "t20", "t20i", "ipl", "icc",
    "captain", "bowler", "batter", "batsman", "record", "history", "win", "lose",
    "मैच", "रन", "विकेट", "ओवर", "भारत", "ऑस्ट्रेलिया", "रोहित", "कोहली", "बुमराह", "हेड"
]

OFF_TOPIC_PATTERNS = [
    "recipe", "cook", "pasta", "pizza", "weather in", "stock market", "bitcoin",
    "crypto", "write a python", "write javascript", "leetcode", "president of",
    "prime minister", "movie", "bollywood", "actor", "song", "math homework", "calculus"
]

@router.post("/matches/ind-aus-thriller/ask-ai")
async def ask_matchmemo_ai(payload: AskMatchMemoAIRequest):
    q_clean = payload.question.strip()
    q_lower = q_clean.lower()

    # 1. Deterministic Guardrail Check
    is_off_topic = any(bad in q_lower for bad in OFF_TOPIC_PATTERNS)
    has_cricket_signal = any(kw in q_lower for kw in ALLOWED_CRICKET_KEYWORDS)

    if is_off_topic or (len(q_clean) > 3 and not has_cricket_signal):
        if payload.language == "hi":
            return {
                "allowed": False,
                "source": "guardrail",
                "answer": "🚫 **MatchMemo Guardrail:** मैं केवल **भारत बनाम ऑस्ट्रेलिया (IND vs AUS)** मैच, क्रिकेट टैक्टिक्स, और इस मैच में खेल रहे खिलाड़ियों के करियर रिकॉर्ड्स व आँकड़ों से जुड़े सवालों के जवाब दे सकता हूँ।"
            }
        return {
            "allowed": False,
            "source": "guardrail",
            "answer": "🚫 **MatchMemo Guardrail:** I am strictly scoped to this **India vs Australia** match, cricket tactics, and the career histories/stats of the participating IND & AUS players. Please ask a cricket-related question!"
        }

    # 2. Call Groq API (DYNAMIC MODEL DISCOVERY)
    import os
    import httpx
    
    api_key = os.getenv("GROQ_API_KEY", "").replace('"', '').replace("'", "").strip()
    
    if api_key and api_key != "gsk_your_new_key_here":
        try:
            lang_instruction = (
                "Respond in engaging Cricket Hindi / Hinglish with relevant cricket emojis (🏏, 🔥, 🎯)."
                if payload.language == "hi"
                else "Respond in crisp, broadcast-grade English (2-4 sentences max) with relevant cricket emojis (🏏, 🔥, 🎯)."
            )
            
            system_prompt = f"""You are MatchMemo AI inside D11 ("Every ball matters"), an expert cricket analyst for this India vs Australia T20 World Cup clash.

STRICT SCOPE:
- You may ONLY answer questions about:
  1. The current live match context below.
  2. India vs Australia head-to-head T20 records.
  3. Pre-match career statistics, styles, and records of the players in this match (Rohit Sharma, Virat Kohli, Rishabh Pant, Suryakumar Yadav, Shivam Dube, Hardik Pandya, Ravindra Jadeja, Axar Patel, Kuldeep Yadav, Jasprit Bumrah, Arshdeep Singh, Travis Head, David Warner, Mitchell Marsh, Glenn Maxwell, Marcus Stoinis, Tim David, Matthew Wade, Pat Cummins, Mitchell Starc, Josh Hazlewood, Adam Zampa).
- If asked about anything else, refuse politely and state your scope.
- {lang_instruction}

LIVE MATCH CONTEXT:
{payload.match_context}"""

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                
                # STEP A: Dynamically discover which models your API key is allowed to use!
                models_url = "https://api.groq.com/openai/v1/models"
                models_response = await client.get(models_url, headers=headers)
                
                models_to_try = []
                if models_response.status_code == 200:
                    model_data = models_response.json().get("data", [])
                    # Extract the IDs of the first 4 text models (excluding whisper/audio models)
                    models_to_try = [m["id"] for m in model_data if "whisper" not in m["id"]][:4]
                    print(f"\n[MatchMemo] Dynamically discovered allowed Groq models for your key: {models_to_try}\n")
                
                # Absolute fallback just in case the discovery endpoint failed
                if not models_to_try:
                    models_to_try = ["llama3-8b-8192", "gemma2-9b-it"]

                # STEP B: Waterfall through the allowed models until one succeeds
                url = "https://api.groq.com/openai/v1/chat/completions"
                
                for model_name in models_to_try:
                    payload_data = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": q_clean}
                        ],
                        "temperature": 0.5,
                        "max_tokens": 150
                    }
                    
                    response = await client.post(url, headers=headers, json=payload_data)
                    
                    if response.status_code == 200:
                        data = response.json()
                        answer_text = data["choices"][0]["message"]["content"]
                        return {
                            "allowed": True,
                            "source": f"groq-{model_name}",
                            "answer": answer_text.strip(),
                        }
                    else:
                        print(f"[MatchMemo Warning] Groq model {model_name} failed: {response.text}")
                
                print("\n[MatchMemo Groq Error] All available models failed.\n")
                
        except Exception as e:
            print(f"\n[MatchMemo Error Trace] HTTP call failed: {type(e).__name__} -> {e}\n")

    # 3. Fallback
    return {
        "allowed": True,
        "source": "d11-intelligence-engine",
        "answer": f"🏏 **MatchMemo Analysis:** Based on live telemetry ({payload.match_context}), this phase hinges on boundary frequency and strike rotation against the active bowling matchups.",
    }