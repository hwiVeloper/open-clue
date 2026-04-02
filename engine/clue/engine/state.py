from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from clue.schema.models import Item, Point, Room, Scenario


@dataclass
class GameState:
    scenario: Scenario
    current_room_id: str
    inventory: list[str] = field(default_factory=list)
    flags: dict[str, Any] = field(default_factory=dict)
    solved_puzzles: set[str] = field(default_factory=set)
    puzzle_attempts: dict[str, int] = field(default_factory=dict)  # point_id -> 시도 횟수
    cleared: bool = False
    start_time: datetime = field(default_factory=datetime.now)

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    @classmethod
    def from_scenario(cls, scenario: Scenario) -> "GameState":
        return cls(
            scenario=scenario,
            current_room_id=scenario.start_room_id,
            flags=dict(scenario.flags),
        )

    # ------------------------------------------------------------------
    # Room / Point helpers
    # ------------------------------------------------------------------

    def current_room(self) -> Room:
        room = self.scenario.get_room(self.current_room_id)
        assert room is not None, f"현재 방 '{self.current_room_id}'을 찾을 수 없습니다."
        return room

    def visible_points(self) -> list[Point]:
        """hidden=False인 포인트만 반환."""
        return [p for p in self.current_room().points if not p.hidden]

    def get_point_in_room(self, point_id: str) -> Point | None:
        for p in self.current_room().points:
            if p.id == point_id:
                return p
        return None

    # ------------------------------------------------------------------
    # Inventory helpers
    # ------------------------------------------------------------------

    def has_item(self, item_id: str) -> bool:
        return item_id in self.inventory

    def add_item(self, item_id: str) -> None:
        if item_id not in self.inventory:
            self.inventory.append(item_id)

    def get_item_info(self, item_id: str) -> Item | None:
        return self.scenario.get_item(item_id)

    # ------------------------------------------------------------------
    # Requirements check
    # ------------------------------------------------------------------

    def check_requirements(self, point: Point) -> tuple[bool, str]:
        """
        전제 조건 충족 여부를 반환. (충족여부, 실패 메시지)
        """
        req = point.requirements
        if req is None:
            return True, ""

        if req.item_id and not self.has_item(req.item_id):
            item = self.scenario.get_item(req.item_id)
            name = item.name if item else req.item_id
            return False, f"[{name}]이(가) 필요합니다."

        if req.flag:
            for key, expected in req.flag.items():
                if self.flags.get(key) != expected:
                    return False, "이 행동을 하기 위한 조건이 충족되지 않았습니다."

        if req.solved_puzzle and req.solved_puzzle not in self.solved_puzzles:
            return False, "먼저 다른 퍼즐을 풀어야 합니다."

        return True, ""

    # ------------------------------------------------------------------
    # Puzzle attempt tracking
    # ------------------------------------------------------------------

    def increment_attempt(self, point_id: str) -> int:
        self.puzzle_attempts[point_id] = self.puzzle_attempts.get(point_id, 0) + 1
        return self.puzzle_attempts[point_id]

    def get_attempts(self, point_id: str) -> int:
        return self.puzzle_attempts.get(point_id, 0)
