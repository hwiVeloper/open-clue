"""clue.engine.mechanics 테스트"""
from __future__ import annotations

import hashlib

import pytest

from clue.schema.models import Action, Item, Point, Puzzle, Room, Scenario
from clue.engine.state import GameState
from clue.engine import mechanics


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _make_scenario(extra_rooms: list[dict] | None = None) -> Scenario:
    data = {
        "scenario_id": "test",
        "version": "1.0",
        "title": "테스트",
        "start_room_id": "room1",
        "flags": {"lights": False},
        "items": [
            {"id": "key", "name": "열쇠", "description": "녹슨 열쇠"},
        ],
        "rooms": [
            {
                "id": "room1",
                "name": "방1",
                "description": "출발 방",
                "points": [
                    {
                        "id": "exit",
                        "name": "출구",
                        "description": "탈출구",
                        "action": {"type": "game_clear", "value": None},
                    }
                ],
            },
            {
                "id": "room2",
                "name": "방2",
                "description": "두 번째 방",
                "points": [],
            },
        ],
    }
    if extra_rooms:
        data["rooms"].extend(extra_rooms)
    return Scenario.model_validate(data)


def _state(scenario: Scenario | None = None) -> GameState:
    s = scenario or _make_scenario()
    return GameState.from_scenario(s)


def _point_with_puzzle(answer: str, max_attempts: int | None = None) -> Point:
    return Point(
        id="lock",
        name="자물쇠",
        description="숫자 자물쇠",
        puzzle=Puzzle(
            question="비밀번호는?",
            answer_hash=_hash(answer),
            max_attempts=max_attempts,
            on_success=Action(type="game_clear"),
        ),
    )


# ---------------------------------------------------------------------------
# execute_actions: get_item
# ---------------------------------------------------------------------------

def test_get_item_adds_to_inventory():
    state = _state()
    action = Action(type="get_item", value="key")
    results = mechanics.execute_actions(state, action)
    assert state.has_item("key")
    assert results[0].item_gained == "key"


def test_get_item_already_owned():
    state = _state()
    state.add_item("key")
    action = Action(type="get_item", value="key")
    results = mechanics.execute_actions(state, action)
    assert results[0].item_gained is None


# ---------------------------------------------------------------------------
# execute_actions: set_flag
# ---------------------------------------------------------------------------

def test_set_flag():
    state = _state()
    action = Action(type="set_flag", value={"lights": True})
    mechanics.execute_actions(state, action)
    assert state.flags["lights"] is True


# ---------------------------------------------------------------------------
# execute_actions: move_to
# ---------------------------------------------------------------------------

def test_move_to_changes_room():
    state = _state()
    action = Action(type="move_to", value="room2")
    results = mechanics.execute_actions(state, action)
    assert state.current_room_id == "room2"
    assert results[0].moved is True


def test_move_to_nonexistent_room():
    state = _state()
    action = Action(type="move_to", value="ghost")
    results = mechanics.execute_actions(state, action)
    assert state.current_room_id == "room1"  # 이동 안 됨
    assert results[0].moved is False


# ---------------------------------------------------------------------------
# execute_actions: game_clear
# ---------------------------------------------------------------------------

def test_game_clear():
    state = _state()
    action = Action(type="game_clear")
    results = mechanics.execute_actions(state, action)
    assert state.cleared is True
    assert results[0].cleared is True


# ---------------------------------------------------------------------------
# attempt_puzzle
# ---------------------------------------------------------------------------

def test_puzzle_correct_answer():
    state = _state()
    point = _point_with_puzzle("1234")
    success, msg = mechanics.attempt_puzzle(state, point, "1234")
    assert success is True
    assert "lock" in state.solved_puzzles


def test_puzzle_wrong_answer():
    state = _state()
    point = _point_with_puzzle("1234")
    success, msg = mechanics.attempt_puzzle(state, point, "0000")
    assert success is False
    assert "lock" not in state.solved_puzzles


def test_puzzle_max_attempts_exceeded():
    state = _state()
    point = _point_with_puzzle("1234", max_attempts=2)

    mechanics.attempt_puzzle(state, point, "wrong")
    success, msg = mechanics.attempt_puzzle(state, point, "wrong")

    assert success is False
    assert "초과" in msg


def test_puzzle_correct_on_last_attempt():
    state = _state()
    point = _point_with_puzzle("1234", max_attempts=2)

    mechanics.attempt_puzzle(state, point, "wrong")
    success, _ = mechanics.attempt_puzzle(state, point, "1234")

    assert success is True


# ---------------------------------------------------------------------------
# can_attempt_puzzle
# ---------------------------------------------------------------------------

def test_can_attempt_puzzle_already_solved():
    state = _state()
    point = _point_with_puzzle("1234")
    state.solved_puzzles.add("lock")
    can, _ = mechanics.can_attempt_puzzle(state, point)
    assert can is False


def test_can_attempt_puzzle_max_exceeded():
    state = _state()
    point = _point_with_puzzle("1234", max_attempts=1)
    state.puzzle_attempts["lock"] = 1
    can, _ = mechanics.can_attempt_puzzle(state, point)
    assert can is False


def test_can_attempt_puzzle_ok():
    state = _state()
    point = _point_with_puzzle("1234", max_attempts=3)
    can, _ = mechanics.can_attempt_puzzle(state, point)
    assert can is True


# ── key_sequence 퍼즐 ────────────────────────────────────────────────────────

def _make_key_sequence_point(puzzle_id="pt-seq"):
    from clue.schema.models import Point, Puzzle
    return Point(
        id=puzzle_id,
        name="버튼판",
        description="버튼이 있다",
        puzzle=Puzzle(
            type="key_sequence",
            question="순서대로 누르세요",
            answer_hash="",  # key_sequence는 hash 불필요
            keys=["↑", "↓", "←", "→"],
            sequence=["↑", "←", "↑"],
            on_success={"type": "game_clear", "value": None},
        ),
    )


def test_key_sequence_correct(make_state):
    state = make_state()
    point = _make_key_sequence_point()
    ok, msg = mechanics.attempt_puzzle(state, point, "1 3 1")  # ↑=1, ←=3
    assert ok is True


def test_key_sequence_wrong(make_state):
    state = make_state()
    point = _make_key_sequence_point()
    ok, msg = mechanics.attempt_puzzle(state, point, "1 2 1")  # ↓ 대신 ←
    assert ok is False


def test_key_sequence_invalid_input(make_state):
    state = make_state()
    point = _make_key_sequence_point()
    ok, msg = mechanics.attempt_puzzle(state, point, "abc")
    assert ok is False


# ── NPC 대화 ─────────────────────────────────────────────────────────────────

def test_talk_to_npc_unconditional(make_state):
    from clue.schema.models import Npc, NpcLine
    from clue.engine.mechanics import talk_to_npc
    npc = Npc(id="npc-1", name="박사", description="노인", lines=[
        NpcLine(text="안녕하세요.", condition=None),
    ])
    state = make_state()
    lines = talk_to_npc(npc, state)
    assert lines == ["안녕하세요."]


def test_talk_to_npc_flag_condition_met(make_state):
    from clue.schema.models import Npc, NpcLine
    from clue.engine.mechanics import talk_to_npc
    npc = Npc(id="npc-1", name="박사", description="노인", lines=[
        NpcLine(text="문이 열렸군요.", condition={"flag": {"door_open": True}}),
    ])
    state = make_state()
    state.flags["door_open"] = True
    lines = talk_to_npc(npc, state)
    assert lines == ["문이 열렸군요."]


def test_talk_to_npc_flag_condition_not_met(make_state):
    from clue.schema.models import Npc, NpcLine
    from clue.engine.mechanics import talk_to_npc
    npc = Npc(id="npc-1", name="박사", description="노인", lines=[
        NpcLine(text="문이 열렸군요.", condition={"flag": {"door_open": True}}),
    ])
    state = make_state()
    state.flags["door_open"] = False
    lines = talk_to_npc(npc, state)
    assert lines == ["할 말이 없는 것 같다."]
