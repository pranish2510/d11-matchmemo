from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA_PATH = ROOT / "data" / "ind_vs_aus_40_overs.json"
MATCH_ID = "ind-aus-thriller"

INDIA_BATTERS = [
    "Rohit Sharma",
    "Virat Kohli",
    "Suryakumar Yadav",
    "Shivam Dube",
    "Rishabh Pant",
    "Hardik Pandya",
    "Ravindra Jadeja",
    "Axar Patel",
    "Kuldeep Yadav",
    "Arshdeep Singh",
]

AUSTRALIA_BATTERS = [
    "David Warner",
    "Travis Head",
    "Mitchell Marsh",
    "Glenn Maxwell",
    "Marcus Stoinis",
    "Matthew Wade",
    "Tim David",
    "Pat Cummins",
    "Mitchell Starc",
    "Josh Hazlewood",
]

INDIA_BOWLERS = [
    "Mitchell Starc",
    "Josh Hazlewood",
    "Pat Cummins",
    "Marcus Stoinis",
    "Adam Zampa",
    "Mitchell Marsh",
]

AUSTRALIA_BOWLERS = [
    "Arshdeep Singh",
    "Jasprit Bumrah",
    "Kuldeep Yadav",
    "Axar Patel",
    "Ravindra Jadeja",
    "Hardik Pandya",
]


@lru_cache(maxsize=None)
def decompose_over(total: int, wicket_positions: tuple[int, ...] = ()) -> list[int]:
    wicket_set = set(wicket_positions)

    @lru_cache(maxsize=None)
    def solve(remaining: int, index: int) -> tuple[int, ...] | None:
        if index == 6:
            return () if remaining == 0 else None
        if index in wicket_set:
            result = solve(remaining, index + 1)
            if result is not None:
                return (0,) + result
            return None
        for value in range(7):
            if value > remaining:
                continue
            next_state = solve(remaining - value, index + 1)
            if next_state is not None:
                return (value,) + next_state
        return None

    result = solve(total, 0)
    if result is None:
        raise ValueError(f"Could not decompose total {total} into six balls with wicket positions {wicket_positions!r}")
    return list(result)


def _commentary(batter: str, bowler: str, runs: int, wicket: bool, over_label: str, boundary: bool) -> str:
    if wicket:
        return f"{batter} is gone! {bowler} takes the wicket as the field celebrates in {over_label}."
    if runs == 6:
        return f"{batter} launches it into the crowd! A towering six off {bowler} in {over_label}."
    if runs == 4:
        return f"{batter} times it beautifully, piercing the field for four off {bowler} in {over_label}."
    if runs == 0:
        return f"{bowler} keeps it tight; {batter} can only defend it and the over stays quiet."
    if runs == 1:
        return f"{batter} nudges one into the ring for a quick single as {bowler} keeps the pressure on."
    if runs == 2:
        return f"{batter} works a quick double to rotate strike and keep the scoreboard moving."
    if runs == 3:
        return f"{batter} hustles hard for three runs and turns the pressure back onto the bowling side."
    if boundary:
        return f"{batter} finds the gap and races away for a boundary against {bowler}."
    return f"{batter} keeps it moving with a smart run against {bowler}."


def _build_event(
    *,
    event_id: int,
    innings: int,
    over_number: int,
    ball_in_over: int,
    batter: str,
    non_striker: str,
    bowler: str,
    batter_runs: int,
    total_runs: int,
    is_wicket: bool,
    player_out: str | None,
    dismissal_text: str | None,
    commentary: str,
) -> dict:
    return {
        "event_id": event_id,
        "match_id": MATCH_ID,
        "innings": innings,
        "over_number": over_number,
        "ball_in_over": ball_in_over,
        "over_label": f"{over_number + 1}.{ball_in_over}",
        "team_batting": "IND" if innings == 1 else "AUS",
        "team_bowling": "AUS" if innings == 1 else "IND",
        "batter": batter,
        "non_striker": non_striker,
        "bowler": bowler,
        "batter_runs": batter_runs,
        "extra_type": None,
        "extra_runs": 0,
        "total_runs": total_runs,
        "is_legal_delivery": True,
        "is_boundary_four": total_runs == 4,
        "is_boundary_six": total_runs == 6,
        "is_wicket": is_wicket,
        "dismissal_type": dismissal_text,
        "player_out": player_out,
        "fielder": None,
        "commentary": commentary,
    }


def generate_dataset() -> list[dict]:
    innings_one_over_totals = [
        9, 11, 26, 7, 10, 8, 11, 9, 10, 12, 14, 5, 7, 6, 7, 8, 9, 10, 9, 17,
    ]
    innings_two_over_totals = [
        7, 11, 14, 8, 9, 16, 10, 11, 12, 9, 7, 9, 12, 7, 6, 5, 8, 5, 5, 10,
    ]
    wicket_map = {
        1: {2: (1,), 8: (1,), 10: (2,), 12: (1,), 17: (1,)},
        2: {0: (1,), 8: (2,), 12: (2, 4), 15: (1,), 16: (1, 3)},
    }

    events: list[dict] = []
    event_id = 1

    for innings, totals in {1: innings_one_over_totals, 2: innings_two_over_totals}.items():
        batting_order = INDIA_BATTERS if innings == 1 else AUSTRALIA_BATTERS
        bowling_order = AUSTRALIA_BOWLERS if innings == 1 else INDIA_BOWLERS
        batter_index = 0
        non_striker_index = 1

        for over_number, over_runs in enumerate(totals):
            wicket_positions = wicket_map.get(innings, {}).get(over_number, ())
            ball_values = decompose_over(over_runs, wicket_positions)
            for ball_in_over, total_runs in enumerate(ball_values, start=1):
                batter = batting_order[batter_index]
                non_striker = batting_order[non_striker_index] if non_striker_index < len(batting_order) else batter
                is_wicket = (ball_in_over - 1) in wicket_positions
                if is_wicket:
                    player_out = batter
                    dismissal_text = "b"
                else:
                    player_out = None
                    dismissal_text = None
                if is_wicket:
                    commentary = _commentary(batter, bowling_order[over_number % len(bowling_order)], total_runs, True, f"{over_number + 1}.{ball_in_over}", False)
                    batter_index = min(batter_index + 1, len(batting_order) - 1)
                    non_striker_index = min(non_striker_index + 1, len(batting_order) - 1)
                else:
                    commentary = _commentary(batter, bowling_order[over_number % len(bowling_order)], total_runs, False, f"{over_number + 1}.{ball_in_over}", total_runs in {4, 6})

                if total_runs % 2 == 1 and not is_wicket and ball_in_over % 2 == 1:
                    batter_index, non_striker_index = non_striker_index, batter_index

                event = _build_event(
                    event_id=event_id,
                    innings=innings,
                    over_number=over_number,
                    ball_in_over=ball_in_over,
                    batter=batter,
                    non_striker=non_striker,
                    bowler=bowling_order[over_number % len(bowling_order)],
                    batter_runs=total_runs,
                    total_runs=total_runs,
                    is_wicket=is_wicket,
                    player_out=player_out,
                    dismissal_text=dismissal_text,
                    commentary=commentary,
                )
                events.append(event)
                event_id += 1

    return events


def write_dataset() -> list[dict]:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataset = generate_dataset()
    with DATA_PATH.open("w", encoding="utf-8") as handle:
        json.dump(dataset, handle, ensure_ascii=False, indent=2)
    return dataset


if __name__ == "__main__":
    write_dataset()
