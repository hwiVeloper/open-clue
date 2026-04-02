from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import typer

from clue.schema.validator import validate_json_file
from clue.cipher.encrypt import encrypt_scenario

app = typer.Typer(
    name="clue",
    help="OpenClue — Terminal-Based Escape Room Engine",
    add_completion=False,
    invoke_without_command=True,
)


def _get_scenario_dir() -> Path:
    """PyInstaller 번들 환경과 일반 개발 환경 모두에서 올바른 scenarios/ 경로를 반환합니다."""
    if getattr(sys, "frozen", False):
        # PyInstaller --onefile: 번들 리소스는 _MEIPASS 임시 디렉토리에 압축 해제됨
        return Path(sys._MEIPASS) / "scenarios"
    # 일반 개발 환경: engine/scenarios/
    return Path(__file__).parent.parent / "scenarios"


# 시나리오 파일을 탐색할 기본 디렉토리
_DEFAULT_SCENARIO_DIR = _get_scenario_dir()


@app.callback(invoke_without_command=True)
def default(ctx: typer.Context) -> None:
    """OpenClue를 실행합니다. 서브커맨드 없이 실행하면 게임을 시작합니다."""
    if ctx.invoked_subcommand is None:
        play(scenario=None)


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
    scenario: Optional[str] = typer.Argument(
        None,
        help="시나리오 파일 경로 (.dat 또는 .json). 생략 시 scenarios/ 폴더에서 자동 탐색.",
    ),
) -> None:
    """방탈출 게임을 시작합니다."""
    from clue.ui.app import OpenClueApp

    paths: list[Path] = []

    if scenario:
        p = Path(scenario)
        if not p.exists():
            typer.echo(f"[오류] 파일을 찾을 수 없습니다: {scenario}", err=True)
            raise typer.Exit(1)
        paths = [p]
    else:
        # scenarios/ 디렉토리 자동 탐색
        scan_dir = _DEFAULT_SCENARIO_DIR
        if scan_dir.exists():
            paths = sorted(scan_dir.glob("*.dat"), key=lambda p: p.name)
        if not paths:
            typer.echo("[오류] 시나리오 파일을 찾을 수 없습니다.", err=True)
            typer.echo(f"  탐색 위치: {scan_dir}", err=True)
            typer.echo("  직접 경로를 지정하거나 scenarios/ 폴더에 .dat 파일을 넣어주세요.", err=True)
            raise typer.Exit(1)

    OpenClueApp(paths).run()


if __name__ == "__main__":
    app()
