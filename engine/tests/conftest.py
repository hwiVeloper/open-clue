"""공통 pytest fixtures"""
from __future__ import annotations

import pytest

from clue.schema.models import Scenario
from clue.engine.state import GameState


@pytest.fixture
def make_state():
    """GameState 팩토리 fixture. 인자 없이 호출하면 기본 시나리오로 생성."""
    def _factory() -> GameState:
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
            ],
        }
        scenario = Scenario.model_validate(data)
        return GameState.from_scenario(scenario)
    return _factory


@pytest.fixture
def base_scenario():
    """Scenario 팩토리 fixture. 인자 없이 호출하면 기본 시나리오 반환."""
    def _factory() -> Scenario:
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
                },
            ],
        }
        return Scenario.model_validate(data)
    return _factory
