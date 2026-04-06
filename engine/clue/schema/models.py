from __future__ import annotations

from typing import Any, Literal, Union
from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Action
# ---------------------------------------------------------------------------

class Action(BaseModel):
    type: Literal["get_item", "set_flag", "move_to", "game_clear"]
    value: Any = None


# ---------------------------------------------------------------------------
# Requirements
# ---------------------------------------------------------------------------

class Requirements(BaseModel):
    item_id: str | None = None
    flag: dict[str, Any] | None = None
    solved_puzzle: str | None = None


# ---------------------------------------------------------------------------
# Puzzle
# ---------------------------------------------------------------------------

class Puzzle(BaseModel):
    type: Literal["text_input", "key_sequence", "timer"] = "text_input"
    question: str
    hint: str | None = None
    answer_hash: str  # SHA-256 hex digest, or "plain:<answer>" before build
    max_attempts: int | None = None
    time_limit_seconds: int | None = None
    fail_message: str | None = None
    # key_sequence 전용
    keys: list[str] = Field(default_factory=list)
    sequence: list[str] = Field(default_factory=list)
    on_success: Union[Action, list[Action]]


# ---------------------------------------------------------------------------
# Point
# ---------------------------------------------------------------------------

class Point(BaseModel):
    id: str
    name: str
    description: str
    hidden: bool = False
    requirements: Requirements | None = None
    observation: str | None = None
    action: Union[Action, list[Action], None] = None
    puzzle: Puzzle | None = None


# ---------------------------------------------------------------------------
# NPC
# ---------------------------------------------------------------------------

class NpcLine(BaseModel):
    text: str
    condition: dict | None = None  # {"flag": {"key": value}}

class Npc(BaseModel):
    id: str
    name: str
    description: str
    lines: list[NpcLine] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Room
# ---------------------------------------------------------------------------

class Room(BaseModel):
    id: str
    name: str
    description: str
    points: list[Point] = Field(default_factory=list)
    npcs: list[Npc] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Item
# ---------------------------------------------------------------------------

class Item(BaseModel):
    id: str
    name: str
    description: str
    usable_on: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Scenario
# ---------------------------------------------------------------------------

class Scenario(BaseModel):
    scenario_id: str
    version: str = "1.0"
    title: str
    author: str | None = None
    difficulty: int | None = Field(default=None, ge=1, le=5)
    estimated_minutes: int | None = None
    start_room_id: str
    flags: dict[str, Any] = Field(default_factory=dict)
    intro_text: str | None = None
    outro_text: str | None = None
    items: list[Item] = Field(default_factory=list)
    rooms: list[Room]

    @model_validator(mode="after")
    def _at_least_one_room(self) -> "Scenario":
        if not self.rooms:
            raise ValueError("시나리오에 방이 최소 1개 있어야 합니다.")
        return self

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def get_room(self, room_id: str) -> Room | None:
        for room in self.rooms:
            if room.id == room_id:
                return room
        return None

    def get_item(self, item_id: str) -> Item | None:
        for item in self.items:
            if item.id == item_id:
                return item
        return None

    def get_point(self, point_id: str) -> tuple[Room, Point] | None:
        """현재 방 관계없이 전체에서 포인트 검색."""
        for room in self.rooms:
            for point in room.points:
                if point.id == point_id:
                    return room, point
        return None
