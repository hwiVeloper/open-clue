from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Action, Scenario


class ValidationError(Exception):
    pass


def _collect_actions(action_or_list: Any) -> list[Action]:
    if action_or_list is None:
        return []
    if isinstance(action_or_list, list):
        return action_or_list
    return [action_or_list]


def validate_scenario(scenario: Scenario) -> list[str]:
    """
    시나리오 로직 무결성 검사.
    문제 목록(str)을 반환. 빈 리스트면 이상 없음.
    """
    errors: list[str] = []
    room_ids = {r.id for r in scenario.rooms}
    item_ids = {i.id for i in scenario.items}

    # 시작 방 존재 여부
    if scenario.start_room_id not in room_ids:
        errors.append(
            f"start_room_id '{scenario.start_room_id}'가 rooms 목록에 없습니다."
        )

    seen_point_ids: set[str] = set()
    has_game_clear = False

    for room in scenario.rooms:
        for point in room.points:
            # 포인트 ID 중복
            if point.id in seen_point_ids:
                errors.append(
                    f"포인트 ID '{point.id}'가 중복됩니다."
                )
            seen_point_ids.add(point.id)

            # requirements 아이템 존재 여부
            if point.requirements and point.requirements.item_id:
                if point.requirements.item_id not in item_ids:
                    errors.append(
                        f"포인트 '{point.id}' requirements.item_id "
                        f"'{point.requirements.item_id}'가 items에 없습니다."
                    )

            # action 검사
            for action in _collect_actions(point.action):
                errors.extend(_check_action(action, room_ids, item_ids, point.id))
                if action.type == "game_clear":
                    has_game_clear = True

            # puzzle on_success 검사
            if point.puzzle:
                for action in _collect_actions(point.puzzle.on_success):
                    errors.extend(
                        _check_action(action, room_ids, item_ids, point.id)
                    )
                    if action.type == "game_clear":
                        has_game_clear = True

    # game_clear 액션 최소 1개
    if not has_game_clear:
        errors.append("game_clear 액션이 하나도 없습니다. 탈출 경로를 추가하세요.")

    # 고립 방(Dead-end Room) 탐지: start_room에서 move_to로 도달 불가능한 방
    if scenario.start_room_id in room_ids:
        reachable: set[str] = set()
        queue = [scenario.start_room_id]
        while queue:
            current = queue.pop()
            if current in reachable:
                continue
            reachable.add(current)
            room = next((r for r in scenario.rooms if r.id == current), None)
            if room is None:
                continue
            for point in room.points:
                for action in _collect_actions(point.action):
                    if action.type == "move_to" and action.value not in reachable:
                        queue.append(action.value)
                if point.puzzle:
                    for action in _collect_actions(point.puzzle.on_success):
                        if action.type == "move_to" and action.value not in reachable:
                            queue.append(action.value)
        unreachable = room_ids - reachable
        for room_id in sorted(unreachable):
            errors.append(
                f"방 '{room_id}'는 start_room에서 도달할 수 없는 고립 방입니다."
            )

    return errors


def _check_action(
    action: Action,
    room_ids: set[str],
    item_ids: set[str],
    point_id: str,
) -> list[str]:
    errors: list[str] = []
    if action.type == "get_item" and action.value not in item_ids:
        errors.append(
            f"포인트 '{point_id}' get_item 값 '{action.value}'가 items에 없습니다."
        )
    if action.type == "move_to" and action.value not in room_ids:
        errors.append(
            f"포인트 '{point_id}' move_to 값 '{action.value}'가 rooms에 없습니다."
        )
    return errors


def validate_json_file(path: str | Path) -> list[str]:
    """JSON 파일 경로를 받아 파싱 + 로직 검사 후 오류 목록 반환."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    try:
        scenario = Scenario.model_validate(data)
    except Exception as exc:
        return [f"스키마 파싱 오류: {exc}"]
    return validate_scenario(scenario)
