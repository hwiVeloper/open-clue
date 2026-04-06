from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any

from clue.schema.models import Action, Point, Puzzle
from clue.engine.state import GameState


@dataclass
class ActionResult:
    message: str
    moved: bool = False
    cleared: bool = False
    item_gained: str | None = None


def _collect_actions(action_or_list: Any) -> list[Action]:
    if action_or_list is None:
        return []
    if isinstance(action_or_list, list):
        return action_or_list
    return [action_or_list]


def execute_actions(state: GameState, action_or_list: Any) -> list[ActionResult]:
    """액션(또는 액션 리스트)을 순서대로 실행하고 결과 목록 반환."""
    results = []
    for action in _collect_actions(action_or_list):
        results.append(_execute_single(state, action))
    return results


def _execute_single(state: GameState, action: Action) -> ActionResult:
    if action.type == "get_item":
        item_id: str = action.value
        if state.has_item(item_id):
            item = state.get_item_info(item_id)
            return ActionResult(
                message=f"이미 [{item.name if item else item_id}]을(를) 가지고 있습니다."
            )
        state.add_item(item_id)
        item = state.get_item_info(item_id)
        name = item.name if item else item_id
        return ActionResult(
            message=f"[{name}]을(를) 획득했습니다.",
            item_gained=item_id,
        )

    elif action.type == "set_flag":
        for key, val in (action.value or {}).items():
            state.flags[key] = val
        return ActionResult(message="")

    elif action.type == "move_to":
        room_id: str = action.value
        room = state.scenario.get_room(room_id)
        if room is None:
            return ActionResult(message=f"알 수 없는 방: {room_id}")
        state.current_room_id = room_id
        return ActionResult(
            message=f"[{room.name}](으)로 이동했습니다.",
            moved=True,
        )

    elif action.type == "game_clear":
        state.cleared = True
        return ActionResult(message="탈출 성공!", cleared=True)

    return ActionResult(message="")


# ---------------------------------------------------------------------------
# Puzzle
# ---------------------------------------------------------------------------

def verify_answer(user_input: str, answer_hash: str) -> bool:
    digest = hashlib.sha256(user_input.strip().encode()).hexdigest()
    return digest == answer_hash


def verify_sequence(user_input: str, puzzle_keys: list[str], expected: list[str]) -> bool:
    """
    사용자가 입력한 공백 구분 번호 목록을 키 인덱스로 변환해 expected와 비교.
    예: "1 3 1 4" + keys=["↑","↓","←","→"] → ["↑","←","↑","→"]
    """
    parts = user_input.strip().split()
    try:
        selected = [puzzle_keys[int(p) - 1] for p in parts]
    except (ValueError, IndexError):
        return False
    return selected == expected


def attempt_puzzle(
    state: GameState,
    point: Point,
    user_input: str,
) -> tuple[bool, str]:
    """
    퍼즐 정답 시도.
    반환: (성공 여부, 출력 메시지)
    """
    puzzle: Puzzle = point.puzzle  # type: ignore[assignment]

    attempts = state.increment_attempt(point.id)

    # 타입별 정답 판정
    if puzzle.type == "key_sequence":
        correct = verify_sequence(user_input, puzzle.keys, puzzle.sequence)
    else:
        correct = verify_answer(user_input, puzzle.answer_hash)

    if correct:
        state.solved_puzzles.add(point.id)
        results = execute_actions(state, puzzle.on_success)
        messages = [r.message for r in results if r.message]
        return True, "\n".join(messages) if messages else "성공!"

    # 오답
    fail_msg = puzzle.fail_message or "틀렸습니다. 다시 시도하세요."
    if puzzle.max_attempts is not None:
        remaining = puzzle.max_attempts - attempts
        if remaining <= 0:
            return False, f"{fail_msg}\n\n시도 횟수를 초과했습니다."
        fail_msg = f"{fail_msg}  (남은 시도: {remaining}회)"

    return False, fail_msg


def can_attempt_puzzle(state: GameState, point: Point) -> tuple[bool, str]:
    """퍼즐을 시도할 수 있는지 확인. 이미 푼 경우나 시도 초과 처리."""
    if point.id in state.solved_puzzles:
        return False, "이미 풀린 퍼즐입니다."

    puzzle: Puzzle = point.puzzle  # type: ignore[assignment]
    if puzzle.max_attempts is not None:
        if state.get_attempts(point.id) >= puzzle.max_attempts:
            return False, "시도 횟수를 초과했습니다."

    return True, ""


# ---------------------------------------------------------------------------
# NPC
# ---------------------------------------------------------------------------

def talk_to_npc(npc: "Npc", state: GameState) -> list[str]:  # type: ignore[name-defined]
    """
    NPC 대화 실행. 조건에 맞는 대사 목록 반환.
    조건: line.condition이 None이거나 line.condition["flag"]의 모든 항목이 state.flags에 일치.
    빈 목록이면 "할 말이 없는 것 같다." 반환.
    """
    from clue.schema.models import Npc  # 순환 방지를 위해 지역 import
    lines: list[str] = []
    for line in npc.lines:
        if line.condition is None:
            lines.append(line.text)
        elif flag_cond := (line.condition.get("flag") or {}):
            if all(state.flags.get(k) == v for k, v in flag_cond.items()):
                lines.append(line.text)
    return lines if lines else ["할 말이 없는 것 같다."]
