from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.models.database import get_ball_events, initialize_database


def test_seeded_dataset_has_40_over_thriller_events() -> None:
    initialize_database()
    events = get_ball_events("ind-aus-thriller")
    assert len(events) >= 240


def testinit_endpoint_supports_both_innings_and_over_selection() -> None:
    client = TestClient(app)
    for innings in (1, 2):
        for over in (0, 5, 10, 19):
            response = client.post(
                "/matches/ind-aus-thriller/simulation/init",
                json={"innings": innings, "start_over": over},
            )
            assert response.status_code == 200, response.text
            payload = response.json()
            assert payload["current_innings"] == innings
            assert payload["current_event_id"] >= 1


def test_step_endpoint_handles_next_ball_prev_ball_and_next_over() -> None:
    client = TestClient(app)
    init = client.post(
        "/matches/ind-aus-thriller/simulation/init",
        json={"innings": 1, "start_over": 0},
    )
    assert init.status_code == 200
    first = init.json()

    next_ball = client.post(
        "/matches/ind-aus-thriller/simulation/step",
        json={"direction": "next_ball"},
    )
    assert next_ball.status_code == 200
    assert next_ball.json()["current_event_id"] == first["current_event_id"] + 1

    prev_ball = client.post(
        "/matches/ind-aus-thriller/simulation/step",
        json={"direction": "prev_ball"},
    )
    assert prev_ball.status_code == 200
    assert prev_ball.json()["current_event_id"] == first["current_event_id"]

    next_over = client.post(
        "/matches/ind-aus-thriller/simulation/step",
        json={"direction": "next_over"},
    )
    assert next_over.status_code == 200
    assert next_over.json()["current_event_id"] >= first["current_event_id"] + 6


def test_presence_endpoint_offline_online_works_with_matchmemo_catchup_for_en_and_hi() -> None:
    client = TestClient(app)
    client.post("/matches/ind-aus-thriller/simulation/init", json={"innings": 2, "start_over": 0})
    offline = client.post("/matches/ind-aus-thriller/presence", json={"status": "offline", "language": "en"})
    assert offline.status_code == 200
    state = offline.json()["state"]
    assert state["user_status"] == "offline"

    client.post("/matches/ind-aus-thriller/simulation/step", json={"direction": "next_ball"})
    client.post("/matches/ind-aus-thriller/simulation/step", json={"direction": "next_ball"})

    online = client.post("/matches/ind-aus-thriller/presence", json={"status": "online", "language": "en"})
    assert online.status_code == 200
    payload = online.json()
    assert payload["state"]["user_status"] == "online"
    assert payload["match_memo"]["quick_recap"]
    assert payload["match_memo"]["detailed_recap"]

    hi = client.post("/matches/ind-aus-thriller/presence", json={"status": "online", "language": "hi"})
    assert hi.status_code == 200
    assert hi.json()["match_memo"]["language"] == "hi"
