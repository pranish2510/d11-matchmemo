from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CurrentBatter(BaseModel):
    name: str
    runs: int
    balls: int
    fours: int
    sixes: int
    strike_rate: float
    on_strike: bool


class CurrentBowler(BaseModel):
    name: str
    overs: str
    maidens: int
    runs_conceded: int
    wickets: int
    economy: float


class Partnership(BaseModel):
    runs: int
    balls: int
    batter_1: str
    batter_2: str


class RecentDelivery(BaseModel):
    event_id: int
    over_label: str
    badge: str
    is_wicket: bool
    is_boundary: bool
    total_runs: int


class WicketFall(BaseModel):
    score_at_fall: str
    player_out: str
    over_label: str
    bowler: str
    dismissal_text: str


class OverSummary(BaseModel):
    innings: int
    over_number: int
    start_event_id: int
    end_event_id: int
    score_after_over: int
    runs_in_over: int
    wickets_in_over: int
    key_highlight: str


class BallEvent(BaseModel):
    event_id: int
    match_id: str
    innings: int
    over_number: int
    ball_in_over: int
    over_label: str
    batter: str
    non_striker: str
    bowler: str
    batter_runs: int
    extra_type: str | None = None
    extra_runs: int = 0
    total_runs: int = 0
    is_legal_delivery: bool = True
    is_boundary_four: bool = False
    is_boundary_six: bool = False
    is_wicket: bool = False
    dismissal_type: str | None = None
    player_out: str | None = None
    fielder: str | None = None
    commentary: str


class MatchStateResponse(BaseModel):
    match_id: str
    title: str
    venue: str
    status: str
    is_simulating: bool = False
    current_innings: int
    current_event_id: int
    total_events_available: int
    team_batting: str
    team_bowling: str
    innings: int
    runs: int
    wickets: int
    legal_balls: int
    overs_display: str
    run_rate: float
    target: int | None = None
    required_run_rate: float | None = None
    runs_needed: int | None = None
    balls_remaining: int | None = None
    innings_1_summary: str | None = None
    last_5_overs_summary: dict[str, int]
    current_batters: list[CurrentBatter]
    current_bowler: CurrentBowler | None
    partnership: Partnership
    this_over_deliveries: list[RecentDelivery] = []
    recent_deliveries: list[RecentDelivery]
    fall_of_wickets: list[WicketFall]
    recent_commentary: list[str]
    over_summaries: list[OverSummary] = []
    user_status: Literal["online", "offline"] = "online"
    offline_checkpoint_event_id: int | None = None
    missed_balls_count: int = 0


class MatchRecord(BaseModel):
    match_id: str
    title: str
    team_batting: str
    team_bowling: str
    venue: str
    status: str
    current_event_id: int = 0
    current_innings: int = 1
    is_simulating: bool = False
    user_status: Literal["online", "offline"] = "online"
    offline_checkpoint_event_id: int | None = None
    offline_started_at: str | None = None
    last_updated_at: str


class MatchAdvanceRequest(BaseModel):
    step: Literal["ball", "over", "collapse_demo", "reset_checkpoint", "reset_start"]


class MatchEventQuery(BaseModel):
    from_event_id: int = Field(default=1, ge=1)
    to_event_id: int | None = None
    filter: Literal["all", "wickets", "boundaries"] = "all"


class MatchPresenceRequest(BaseModel):
    status: Literal["offline", "online"]
    language: Literal["en", "hi"] = "en"


class MatchSimulationInitRequest(BaseModel):
    innings: Literal[1, 2]
    start_over: int = Field(default=0, ge=0, le=19)


class MatchSimulationStepRequest(BaseModel):
    direction: Literal["next_ball", "prev_ball", "next_over"]


class CatchUpRequest(BaseModel):
    from_event_id: int = Field(default=1, ge=1)
    to_event_id: int = Field(default=1, ge=1)
    language: Literal["en", "hi"] = "en"


class MatchMemoPayload(BaseModel):
    language: Literal["en", "hi"]
    quick_recap: str
    detailed_recap: str
    turning_point: str
    momentum_analysis: str
    watch_next: str
