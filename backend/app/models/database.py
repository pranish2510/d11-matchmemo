from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parents[2] / "d11.db"
DATASET_PATH = Path(__file__).resolve().parents[3] / "data" / "ind_vs_aus_40_overs.json"
MATCH_ID = "ind-aus-thriller"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_table_columns(conn: sqlite3.Connection) -> None:
    table_info = conn.execute("PRAGMA table_info(matches)").fetchall()
    existing = {row[1] for row in table_info}
    if "current_innings" not in existing:
        conn.execute("ALTER TABLE matches ADD COLUMN current_innings INTEGER NOT NULL DEFAULT 1")
    if "user_status" not in existing:
        conn.execute("ALTER TABLE matches ADD COLUMN user_status TEXT NOT NULL DEFAULT 'online'")
    if "offline_checkpoint_event_id" not in existing:
        conn.execute("ALTER TABLE matches ADD COLUMN offline_checkpoint_event_id INTEGER")
    if "offline_started_at" not in existing:
        conn.execute("ALTER TABLE matches ADD COLUMN offline_started_at TEXT")
    if "is_simulating" not in existing:
        conn.execute("ALTER TABLE matches ADD COLUMN is_simulating INTEGER NOT NULL DEFAULT 0")


def initialize_database() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS matches (
                match_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                team_batting TEXT NOT NULL,
                team_bowling TEXT NOT NULL,
                venue TEXT NOT NULL,
                status TEXT NOT NULL,
                current_event_id INTEGER NOT NULL DEFAULT 0,
                current_innings INTEGER NOT NULL DEFAULT 1,
                is_simulating INTEGER NOT NULL DEFAULT 0,
                user_status TEXT NOT NULL DEFAULT 'online',
                offline_checkpoint_event_id INTEGER,
                offline_started_at TEXT,
                last_updated_at TEXT NOT NULL
            )
            """
        )
        _ensure_table_columns(conn)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ball_events (
                event_id INTEGER NOT NULL,
                match_id TEXT NOT NULL,
                innings INTEGER NOT NULL,
                over_number INTEGER NOT NULL,
                ball_in_over INTEGER NOT NULL,
                over_label TEXT NOT NULL,
                batter TEXT NOT NULL,
                non_striker TEXT NOT NULL,
                bowler TEXT NOT NULL,
                batter_runs INTEGER NOT NULL,
                extra_type TEXT,
                extra_runs INTEGER NOT NULL,
                total_runs INTEGER NOT NULL,
                is_legal_delivery INTEGER NOT NULL,
                is_boundary_four INTEGER NOT NULL,
                is_boundary_six INTEGER NOT NULL,
                is_wicket INTEGER NOT NULL,
                dismissal_type TEXT,
                player_out TEXT,
                fielder TEXT,
                commentary TEXT NOT NULL,
                PRIMARY KEY (event_id, match_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS session_checkpoints (
                session_id TEXT NOT NULL,
                match_id TEXT NOT NULL,
                last_viewed_event_id INTEGER NOT NULL,
                last_viewed_at TEXT NOT NULL,
                PRIMARY KEY (session_id, match_id)
            )
            """
        )

        if conn.execute("SELECT COUNT(*) FROM matches WHERE match_id = ?", (MATCH_ID,)).fetchone()[0] == 0:
            seed_match_data(conn)


def seed_match_data(conn: sqlite3.Connection) -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Match dataset not found at {DATASET_PATH}")

    with DATASET_PATH.open("r", encoding="utf-8") as handle:
        events = json.load(handle)

    match_title = "India vs Australia • T20 Thriller"
    venue = "Mumbai"
    status = "Live"
    current_event_id = max((event["event_id"] for event in events), default=0)

    conn.execute(
        """
        INSERT OR REPLACE INTO matches (
            match_id, title, team_batting, team_bowling, venue, status,
            current_event_id, current_innings, is_simulating, user_status,
            offline_checkpoint_event_id, offline_started_at, last_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            MATCH_ID,
            match_title,
            "IND",
            "AUS",
            venue,
            status,
            current_event_id,
            2,
            0,
            "online",
            None,
            None,
            datetime.now(timezone.utc).isoformat(),
        ),
    )

    for event in events:
        conn.execute(
            """
            INSERT OR REPLACE INTO ball_events (
                event_id, match_id, innings, over_number, ball_in_over, over_label,
                batter, non_striker, bowler, batter_runs, extra_type, extra_runs,
                total_runs, is_legal_delivery, is_boundary_four, is_boundary_six,
                is_wicket, dismissal_type, player_out, fielder, commentary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                int(event["event_id"]),
                event["match_id"],
                int(event["innings"]),
                int(event["over_number"]),
                int(event["ball_in_over"]),
                event["over_label"],
                event["batter"],
                event["non_striker"],
                event["bowler"],
                int(event["batter_runs"]),
                event["extra_type"],
                int(event["extra_runs"]),
                int(event["total_runs"]),
                1 if event["is_legal_delivery"] else 0,
                1 if event["is_boundary_four"] else 0,
                1 if event["is_boundary_six"] else 0,
                1 if event["is_wicket"] else 0,
                event["dismissal_type"],
                event["player_out"],
                event["fielder"],
                event["commentary"],
            ),
        )


def get_match_row(match_id: str) -> sqlite3.Row | None:
    with get_connection() as conn:
        return conn.execute("SELECT * FROM matches WHERE match_id = ?", (match_id,)).fetchone()


def list_matches() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT match_id, title, team_batting, team_bowling, venue, status, current_event_id, current_innings, is_simulating, user_status, offline_checkpoint_event_id, offline_started_at, last_updated_at FROM matches ORDER BY match_id"
        ).fetchall()
        return [dict(row) for row in rows]


def get_ball_events(match_id: str, from_event_id: int = 1, to_event_id: int | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        query = "SELECT * FROM ball_events WHERE match_id = ? AND event_id >= ?"
        params: list[Any] = [match_id, from_event_id]
        if to_event_id is not None:
            query += " AND event_id <= ?"
            params.append(to_event_id)
        query += " ORDER BY event_id ASC"
        rows = conn.execute(query, tuple(params)).fetchall()
        return [dict(row) for row in rows]


def update_match_state(match_id: str, current_event_id: int, is_simulating: bool | None = None, current_innings: int | None = None, user_status: str | None = None, offline_checkpoint_event_id: int | None = None, offline_started_at: str | None = None) -> sqlite3.Row | None:
    with get_connection() as conn:
        set_clause = ["current_event_id = ?"]
        assignments: list[Any] = [current_event_id]
        if current_innings is not None:
            set_clause.append("current_innings = ?")
            assignments.append(current_innings)
        if is_simulating is not None:
            set_clause.append("is_simulating = ?")
            assignments.append(int(is_simulating))
        if user_status is not None:
            set_clause.append("user_status = ?")
            assignments.append(user_status)
        if offline_checkpoint_event_id is not None:
            set_clause.append("offline_checkpoint_event_id = ?")
            assignments.append(offline_checkpoint_event_id)
        if offline_started_at is not None:
            set_clause.append("offline_started_at = ?")
            assignments.append(offline_started_at)
        set_clause.append("last_updated_at = ?")
        assignments.extend([datetime.now(timezone.utc).isoformat(), match_id])
        conn.execute(f"UPDATE matches SET {', '.join(set_clause)} WHERE match_id = ?", tuple(assignments))
        return conn.execute("SELECT * FROM matches WHERE match_id = ?", (match_id,)).fetchone()


def set_checkpoint(session_id: str, match_id: str, last_viewed_event_id: int) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO session_checkpoints (session_id, match_id, last_viewed_event_id, last_viewed_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(session_id, match_id)
            DO UPDATE SET last_viewed_event_id = excluded.last_viewed_event_id,
                          last_viewed_at = excluded.last_viewed_at
            """,
            (session_id, match_id, last_viewed_event_id),
        )
