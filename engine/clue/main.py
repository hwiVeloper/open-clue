from __future__ import annotations

from pathlib import Path

import typer

from clue.schema.models import Scenario
from clue.schema.validator import validate_json_file
from clue.cipher.encrypt import encrypt_scenario
from clue.cipher.decrypt import decrypt_scenario, DecryptError
from clue.engine.state import GameState
from clue.engine import mechanics
from clue.engine.parser import parse
from clue.ui import renderer

app = typer.Typer(
    name="clue",
    help="OpenClue — Terminal-Based Escape Room Engine",
    add_completion=False,
)


# ---------------------------------------------------------------------------
# verify
# ---------------------------------------------------------------------------

@app.command()
def verify(
    source: str = typer.Argument(..., help="시나리오 JSON 파일 경로"),
) -> None:
    """시나리오 JSON의 스키마 및 로직 오류를 검사합니다."""
    path = Path(source)
    if not path.exists():
        typer.echo(f"[오류] 파일을 찾을 수 없습니다: {source}", err=True)
        raise typer.Exit(1)

    errors = validate_json_file(path)
    if errors:
        typer.echo("검증 실패:")
        for e in errors:
            typer.echo(f"  [X] {e}")
        raise typer.Exit(1)
    else:
        typer.echo(f"[OK] {path.name} - 이상 없음.")


# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------

@app.command()
def build(
    source: str = typer.Argument(..., help="시나리오 JSON 파일 경로"),
    output: str = typer.Option(None, "--output", "-o", help="출력 .dat 파일 경로"),
) -> None:
    """시나리오 JSON을 AES-256으로 암호화하여 .dat 파일로 빌드합니다."""
    path = Path(source)
    if not path.exists():
        typer.echo(f"[오류] 파일을 찾을 수 없습니다: {source}", err=True)
        raise typer.Exit(1)

    # 검증 먼저
    errors = validate_json_file(path)
    if errors:
        typer.echo("빌드 전 검증 실패:")
        for e in errors:
            typer.echo(f"  [X] {e}")
        raise typer.Exit(1)

    out_path = Path(output) if output else None
    result = encrypt_scenario(path, out_path)
    typer.echo(f"[OK] 빌드 완료: {result}")


# ---------------------------------------------------------------------------
# play
# ---------------------------------------------------------------------------

@app.command()
def play(
    scenario: str = typer.Argument(..., help="시나리오 파일 경로 (.dat 또는 .json)"),
) -> None:
    """방탈출 게임을 시작합니다."""
    path = Path(scenario)
    if not path.exists():
        typer.echo(f"[오류] 파일을 찾을 수 없습니다: {scenario}", err=True)
        raise typer.Exit(1)

    # 로드
    try:
        if path.suffix == ".json":
            import json
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = decrypt_scenario(path)
    except DecryptError as e:
        typer.echo(f"[오류] {e}", err=True)
        raise typer.Exit(1)

    scenario_obj = Scenario.model_validate(data)
    state = GameState.from_scenario(scenario_obj)

    _game_loop(state)


# ---------------------------------------------------------------------------
# Game Loop
# ---------------------------------------------------------------------------

def _game_loop(state: GameState) -> None:
    renderer.clear_screen()
    renderer.render_title(state.scenario.title)
    renderer.render_room(state)

    _last_hint_point_id: str | None = None

    while not state.cleared:
        try:
            raw = renderer.prompt()
        except (EOFError, KeyboardInterrupt):
            renderer.render_info("\n게임을 종료합니다.")
            break

        if not raw:
            continue

        cmd = parse(raw)

        # ------------------------------------------------------------------
        # look
        # ------------------------------------------------------------------
        if cmd.command == "look":
            renderer.render_room(state)

        # ------------------------------------------------------------------
        # inspect
        # ------------------------------------------------------------------
        elif cmd.command == "inspect":
            if not cmd.target:
                renderer.render_error("inspect 뒤에 지점 ID를 입력하세요. (예: inspect bed)")
                continue

            point = state.get_point_in_room(cmd.target)
            if point is None:
                renderer.render_error(
                    f"'{cmd.target}'을(를) 현재 방에서 찾을 수 없습니다. look으로 지점 목록을 확인하세요."
                )
                continue

            # 전제 조건 확인
            ok, reason = state.check_requirements(point)
            if not ok:
                renderer.render_error(reason)
                continue

            # observation 출력
            if point.observation:
                renderer.render_observation(point.observation)

            # action 실행 (퍼즐 없는 경우)
            if point.action and not point.puzzle:
                results = mechanics.execute_actions(state, point.action)
                for r in results:
                    if r.item_gained:
                        renderer.render_success(r.message)
                    elif r.message:
                        renderer.render_info(r.message)
                    if r.moved:
                        renderer.render_room(state)
                    if r.cleared:
                        renderer.render_clear(state)
                        return

            # puzzle 진입
            elif point.puzzle:
                _last_hint_point_id = point.id
                can, reason = mechanics.can_attempt_puzzle(state, point)
                if not can:
                    renderer.render_error(reason)
                    continue

                user_input = renderer.render_puzzle_prompt(point.puzzle.question)
                success, msg = mechanics.attempt_puzzle(state, point, user_input)

                if success:
                    renderer.render_success(msg)
                    if state.cleared:
                        renderer.render_clear(state)
                        return
                    if state.current_room_id != state.current_room_id:
                        pass  # 방 이동은 mechanics 내에서 처리됨
                    renderer.render_room(state)
                else:
                    renderer.render_error(msg)

            elif not point.observation and not point.action and not point.puzzle:
                renderer.render_info("특별한 것을 발견하지 못했습니다.")

        # ------------------------------------------------------------------
        # use
        # ------------------------------------------------------------------
        elif cmd.command == "use":
            if not cmd.target:
                renderer.render_error("use 뒤에 아이템 ID를 입력하세요. (예: use hairpin)")
                continue

            if not state.has_item(cmd.target):
                renderer.render_error(f"'{cmd.target}'을(를) 가지고 있지 않습니다.")
                continue

            renderer.render_item_description(state, cmd.target)

        # ------------------------------------------------------------------
        # inv
        # ------------------------------------------------------------------
        elif cmd.command == "inv":
            renderer.render_inventory(state)
            console_items = []
            for item_id in state.inventory:
                item = state.get_item_info(item_id)
                if item:
                    renderer.render_message(
                        f"  [bold]{item.name}[/bold]: {item.description}",
                        style="green",
                    )

        # ------------------------------------------------------------------
        # hint
        # ------------------------------------------------------------------
        elif cmd.command == "hint":
            # 현재 방에서 풀리지 않은 퍼즐 포인트 찾기
            hint_point = None
            for p in state.current_room().points:
                if p.puzzle and p.id not in state.solved_puzzles:
                    hint_point = p
                    break

            if hint_point and hint_point.puzzle and hint_point.puzzle.hint:
                renderer.render_hint(hint_point.puzzle.hint)
            else:
                renderer.render_hint(None)

        # ------------------------------------------------------------------
        # help
        # ------------------------------------------------------------------
        elif cmd.command == "help":
            renderer.render_help()

        # ------------------------------------------------------------------
        # quit
        # ------------------------------------------------------------------
        elif cmd.command == "quit":
            renderer.render_info("게임을 종료합니다.")
            break

        # ------------------------------------------------------------------
        # unknown
        # ------------------------------------------------------------------
        else:
            renderer.render_error(
                f"알 수 없는 명령어: '{raw}'\n'help'를 입력하면 명령어 목록을 볼 수 있습니다."
            )


if __name__ == "__main__":
    app()
