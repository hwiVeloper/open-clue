"""clue.schema.validator 테스트"""
from __future__ import annotations

import pytest

from clue.schema.models import Scenario
from clue.schema.validator import validate_scenario


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_scenario(**overrides) -> dict:
    """유효한 최소 시나리오 dict를 반환한다."""
    data = {
        "scenario_id": "test",
        "version": "1.0",
        "title": "테스트",
        "start_room_id": "room1",
        "flags": {},
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
            }
        ],
    }
    data.update(overrides)
    return data


def _parse(data: dict) -> Scenario:
    return Scenario.model_validate(data)


# ---------------------------------------------------------------------------
# 정상 케이스
# ---------------------------------------------------------------------------

def test_valid_scenario_no_errors():
    scenario = _parse(_base_scenario())
    assert validate_scenario(scenario) == []


# ---------------------------------------------------------------------------
# start_room_id
# ---------------------------------------------------------------------------

def test_invalid_start_room_id():
    data = _base_scenario(start_room_id="nonexistent")
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    assert any("start_room_id" in e for e in errors)


# ---------------------------------------------------------------------------
# 포인트 ID 중복
# ---------------------------------------------------------------------------

def test_duplicate_point_id():
    data = _base_scenario()
    data["rooms"][0]["points"].append(
        {"id": "exit", "name": "또 다른 포인트", "description": "중복"}
    )
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    assert any("중복" in e for e in errors)


# ---------------------------------------------------------------------------
# requirements.item_id 존재 여부
# ---------------------------------------------------------------------------

def test_missing_required_item():
    data = _base_scenario()
    data["rooms"][0]["points"].append(
        {
            "id": "locked_door",
            "name": "잠긴 문",
            "description": "열쇠가 필요함",
            "requirements": {"item_id": "nonexistent_item"},
        }
    )
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    assert any("nonexistent_item" in e for e in errors)


# ---------------------------------------------------------------------------
# game_clear 없음
# ---------------------------------------------------------------------------

def test_no_game_clear_action():
    data = _base_scenario()
    data["rooms"][0]["points"] = [
        {"id": "note", "name": "메모", "description": "쪽지", "observation": "아무것도 없다."}
    ]
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    assert any("game_clear" in e for e in errors)


# ---------------------------------------------------------------------------
# move_to / get_item 참조 오류
# ---------------------------------------------------------------------------

def test_move_to_nonexistent_room():
    data = _base_scenario()
    data["rooms"][0]["points"].append(
        {
            "id": "portal",
            "name": "포털",
            "description": "어딘가로",
            "action": {"type": "move_to", "value": "ghost_room"},
        }
    )
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    assert any("ghost_room" in e for e in errors)


def test_get_item_nonexistent():
    data = _base_scenario()
    data["rooms"][0]["points"].append(
        {
            "id": "chest",
            "name": "상자",
            "description": "상자",
            "action": {"type": "get_item", "value": "ghost_item"},
        }
    )
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    assert any("ghost_item" in e for e in errors)


# ---------------------------------------------------------------------------
# 고립 방(Dead-end Room) 탐지
# ---------------------------------------------------------------------------

def test_dead_end_room_detected():
    """room2는 room1에서 어떤 move_to로도 도달할 수 없다."""
    data = _base_scenario()
    data["rooms"].append(
        {
            "id": "room2",
            "name": "고립된 방",
            "description": "아무도 못 온다",
            "points": [],
        }
    )
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    assert any("room2" in e and "고립" in e for e in errors)


def test_reachable_room_no_dead_end_error():
    """room1 → room2 move_to가 있으면 고립 오류 없음."""
    data = _base_scenario()
    # room1에 room2로 이동하는 포인트 추가
    data["rooms"][0]["points"].append(
        {
            "id": "passage",
            "name": "통로",
            "description": "다음 방으로",
            "action": {"type": "move_to", "value": "room2"},
        }
    )
    data["rooms"].append(
        {
            "id": "room2",
            "name": "방2",
            "description": "도달 가능",
            "points": [],
        }
    )
    scenario = _parse(data)
    errors = validate_scenario(scenario)
    dead_end_errors = [e for e in errors if "고립" in e]
    assert dead_end_errors == []
