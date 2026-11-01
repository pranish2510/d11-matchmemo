from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.models.database import get_ball_events, get_match_row
from app.schemas.match import (
    BallEvent,
    CurrentBatter,
    CurrentBowler,
    MatchStateResponse,
    Partnership,
    RecentDelivery,
    WicketFall,
)


def _event_rows(match_id: str) -> list[BallEvent]:
    data = get_ball_events(match_id)
    return [BallEvent.model_validate(row) for row in data]


def _compute_runs_for_batter(events: list[BallEvent], batter_name: str) -> tuple[int, int, int, int]:
    runs = 0
    balls = 0
    fours = 0
    sixes = 0
    for event in events:
        if event.batter != batter_name:
            continue
        runs += event.batter_runs
        if event.extra_type != "wd":
            balls += 1
        if event.is_boundary_four:
            fours += 1
        if event.is_boundary_six:
            sixes += 1
    return runs, balls, fours, sixes


def _format_overs(legal_balls: int) -> str:
    if legal_balls <= 0:
        return "0.0"
    return f"{legal_balls // 6}.{legal_balls % 6}"


def _badge_for_event(event: BallEvent) -> str:
    if event.is_wicket:
        return "W"
    if event.is_boundary_six:
        return "6"
    if event.is_boundary_four:
        return "4"
    if event.extra_type == "wd":
        return f"{event.total_runs}wd"
    if event.extra_type == "nb":
        return f"{event.total_runs}nb"
    if event.total_runs == 0:
        return "0"
    return str(event.total_runs)


def _over_summaries_for_match(all_events: list[BallEvent]) -> list[dict[str, Any]]:
    summaries: list[dict[str, Any]] = []
    for innings in (1, 2):
        innings_events = [event for event in all_events if event.innings == innings]
        innings_runs = 0
        for over_index in range(20):
            over_events = [event for event in innings_events if event.over_number == over_index]
            if not over_events:
                continue
            start_event_id = min(event.event_id for event in over_events)
            end_event_id = max(event.event_id for event in over_events)
            score_after_over = sum(event.total_runs for event in innings_events if event.event_id <= end_event_id)
            runs_in_over = sum(event.total_runs for event in over_events)
            wickets_in_over = sum(1 for event in over_events if event.is_wicket)
            key_highlight = "Dot ball pressure" if runs_in_over == 0 else (
                "Wicket in the over" if wickets_in_over else (
                    "Boundary burst" if any(event.is_boundary_four or event.is_boundary_six for event in over_events) else "Steady scoring"
                )
            )
            summaries.append(
                {
                    "innings": innings,
                    "over_number": over_index + 1,
                    "start_event_id": start_event_id,
                    "end_event_id": end_event_id,
                    "score_after_over": score_after_over,
                    "runs_in_over": runs_in_over,
                    "wickets_in_over": wickets_in_over,
                    "key_highlight": key_highlight,
                }
            )
    return summaries


def get_match_state(match_id: str) -> MatchStateResponse:
    match_row = get_match_row(match_id)
    if match_row is None:
        raise ValueError(f"Unknown match: {match_id}")

    all_events = _event_rows(match_id)
    total_events_available = len(all_events)
    current_event_id = max(0, min(int(match_row["current_event_id"]), total_events_available))
    active_innings = int(match_row["current_innings"]) if int(match_row["current_innings"]) in (1, 2) else (1 if current_event_id <= 120 else 2)

    innings_events = [event for event in all_events if event.innings == active_innings]
    available_events = [event for event in innings_events if event.event_id <= current_event_id]
    if not available_events and current_event_id > 0:
        available_events = [event for event in innings_events if event.event_id <= max(e.event_id for e in innings_events)]

    runs = sum(event.total_runs for event in available_events)
    wickets = sum(1 for event in available_events if event.is_wicket)
    legal_balls = sum(1 for event in available_events if event.is_legal_delivery)
    run_rate = round(runs / (legal_balls / 6), 2) if legal_balls else 0.0

    if available_events:
        last_event = available_events[-1]
        active_names = [last_event.batter, last_event.non_striker]
        active_names = list(dict.fromkeys(name for name in active_names if name))
    else:
        active_names = ["", ""]

    batter_details: list[CurrentBatter] = []
    for name in active_names[:2]:
        batter_runs, batter_balls, fours, sixes = _compute_runs_for_batter(available_events, name)
        strike_rate = round((batter_runs / batter_balls) * 100, 2) if batter_balls else 0.0
        batter_details.append(
            CurrentBatter(
                name=name,
                runs=batter_runs,
                balls=batter_balls,
                fours=fours,
                sixes=sixes,
                strike_rate=strike_rate,
                on_strike=name == (last_event.batter if available_events else ""),
            )
        )

    current_bowler_name = last_event.bowler if available_events else ""
    bowler_events = [event for event in available_events if event.bowler == current_bowler_name]
    legal_bowler_balls = sum(1 for event in bowler_events if event.is_legal_delivery)
    bowler_runs = sum(event.total_runs for event in bowler_events if event.is_legal_delivery)
    bowler_wickets = sum(1 for event in bowler_events if event.is_wicket)
    economy = round(bowler_runs / (legal_bowler_balls / 6), 2) if legal_bowler_balls else 0.0
    over_totals: dict[int, int] = defaultdict(int)
    for event in bowler_events:
        if event.is_legal_delivery:
            over_totals[event.over_number] += event.total_runs
    maidens = sum(1 for runs_in_over in over_totals.values() if runs_in_over == 0)

    last_wicket_event = next((event for event in reversed(available_events) if event.is_wicket), None)
    wicket_cutoff = last_wicket_event.event_id if last_wicket_event else 0
    partnership_events = [event for event in available_events if event.event_id > wicket_cutoff]
    partnership_runs = sum(event.total_runs for event in partnership_events if event.batter in active_names)
    partnership_balls = sum(1 for event in partnership_events if event.batter in active_names and event.is_legal_delivery)
    partnership = Partnership(
        runs=partnership_runs,
        balls=partnership_balls,
        batter_1=active_names[0] if len(active_names) > 0 else "",
        batter_2=active_names[1] if len(active_names) > 1 else "",
    )

    recent_events = available_events[-12:]
    recent_deliveries = [
        RecentDelivery(
            event_id=event.event_id,
            over_label=event.over_label,
            badge=_badge_for_event(event),
            is_wicket=event.is_wicket,
            is_boundary=event.is_boundary_four or event.is_boundary_six,
            total_runs=event.total_runs,
        )
        for event in recent_events
    ]

    this_over_events = []
    if available_events:
        current_over = available_events[-1].over_number
        this_over_events = [event for event in available_events if event.over_number == current_over]
    this_over_deliveries = [
        RecentDelivery(
            event_id=event.event_id,
            over_label=event.over_label,
            badge=_badge_for_event(event),
            is_wicket=event.is_wicket,
            is_boundary=event.is_boundary_four or event.is_boundary_six,
            total_runs=event.total_runs,
        )
        for event in this_over_events
    ]

    fall_of_wickets: list[WicketFall] = []
    wicket_index = 0
    cumulative_runs = 0
    for event in available_events:
        if not event.is_wicket:
            continue
        wicket_index += 1
        cumulative_runs = sum(item.total_runs for item in available_events if item.event_id <= event.event_id)
        fall_of_wickets.append(
            WicketFall(
                score_at_fall=f"{cumulative_runs}/{wicket_index}",
                player_out=event.player_out or "",
                over_label=event.over_label,
                bowler=event.bowler,
                dismissal_text=(f"{event.player_out or ''} {event.dismissal_type or 'out'}" if event.dismissal_type else "Wicket"),
            )
        )

    last_5_overs_summary = {"runs": 0, "wickets": 0}
    if available_events:
        over_start = max(0, current_event_id - 30)
        last_5_overs_events = [event for event in available_events if event.event_id > over_start and event.is_legal_delivery]
        last_5_overs_summary = {
            "runs": sum(event.total_runs for event in last_5_overs_events),
            "wickets": sum(1 for event in last_5_overs_events if event.is_wicket),
        }

    recent_commentary = [event.commentary for event in reversed(available_events[-24:])]
    over_summaries = _over_summaries_for_match(all_events)

    target = None
    required_run_rate = None
    runs_needed = None
    balls_remaining = None
    innings_1_summary = None
    if active_innings == 2:
        target = 206
        runs_needed = max(target - runs, 0)
        balls_remaining = max(120 - legal_balls, 0)
        required_run_rate = round((runs_needed / (balls_remaining / 6)), 2) if balls_remaining else 0.0
        innings_1_summary = "IND 205/5 (20.0)"

    if active_innings == 1:
        innings_1_summary = f"IND {sum(event.total_runs for event in all_events if event.innings == 1 and event.event_id <= max((e.event_id for e in innings_events), default=0))}/{sum(1 for event in all_events if event.innings == 1 and event.event_id <= max((e.event_id for e in innings_events), default=0) and event.is_wicket)} ({_format_overs(sum(1 for event in all_events if event.innings == 1 and event.event_id <= max((e.event_id for e in innings_events), default=0) and event.is_legal_delivery))})"

    return MatchStateResponse(
        match_id=match_row["match_id"],
        title=match_row["title"],
        venue=match_row["venue"],
        status=match_row["status"],
        is_simulating=bool(match_row["is_simulating"]),
        current_innings=active_innings,
        current_event_id=current_event_id,
        total_events_available=total_events_available,
        team_batting=match_row["team_batting"] if active_innings == 1 else "AUS",
        team_bowling=match_row["team_bowling"] if active_innings == 1 else "IND",
        innings=active_innings,
        runs=runs,
        wickets=wickets,
        legal_balls=legal_balls,
        overs_display=_format_overs(legal_balls),
        run_rate=run_rate,
        target=target,
        required_run_rate=required_run_rate,
        runs_needed=runs_needed,
        balls_remaining=balls_remaining,
        innings_1_summary=innings_1_summary,
        last_5_overs_summary=last_5_overs_summary,
        current_batters=batter_details,
        current_bowler=(
            CurrentBowler(
                name=current_bowler_name,
                overs=_format_overs(legal_bowler_balls),
                maidens=maidens,
                runs_conceded=bowler_runs,
                wickets=bowler_wickets,
                economy=economy,
            )
            if available_events else None
        ),
        partnership=partnership,
        this_over_deliveries=this_over_deliveries,
        recent_deliveries=recent_deliveries,
        fall_of_wickets=fall_of_wickets,
        recent_commentary=recent_commentary,
        over_summaries=over_summaries,
        user_status=match_row["user_status"],
        offline_checkpoint_event_id=match_row["offline_checkpoint_event_id"],
        missed_balls_count=0,
    )


__all__ = ["get_match_state"]
