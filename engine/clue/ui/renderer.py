from __future__ import annotations

from datetime import datetime, timedelta

from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

from clue.engine.state import GameState

console = Console()

LOGO = """\
  ___                    ____ _
 / _ \\ _ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \\ / _ \\ '_ \\| |   | | | | |/ _ \\
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \\___/| .__/ \\___|_| |_|\\____|_|\\__,_|\\___|
      |_|"""


def render_title(scenario_title: str) -> None:
    console.print(f"\n[bold cyan]{LOGO}[/bold cyan]")
    console.print(
        Panel(
            f"[bold white]{scenario_title}[/bold white]",
            style="dim cyan",
            expand=False,
        )
    )
    console.print()


def render_room(state: GameState) -> None:
    room = state.current_room()
    points = state.visible_points()

    # 방 헤더
    console.rule(f"[bold yellow]  {room.name}  ", style="yellow")

    # 방 묘사
    console.print(
        Panel(room.description, style="dim white", padding=(1, 2))
    )

    # 조사 가능한 지점 목록
    if points:
        table = Table(show_header=False, box=None, padding=(0, 1))
        table.add_column(style="cyan", no_wrap=True)
        table.add_column(style="white")
        for p in points:
            lock = " [red][잠김][/red]" if p.puzzle and p.id not in state.solved_puzzles else ""
            solved = " [green][완료][/green]" if p.id in state.solved_puzzles and p.puzzle else ""
            table.add_row(f"• {p.name}", f"[dim]({p.id})[/dim]{lock}{solved}")
        console.print(
            Panel(table, title="[bold]조사 가능한 지점[/bold]", style="dim")
        )
    else:
        console.print(Panel("[dim]조사할 지점이 없습니다.[/dim]", style="dim"))

    # 인벤토리
    render_inventory(state)
    console.print()


def render_inventory(state: GameState) -> None:
    if not state.inventory:
        inv_text = "[dim]없음[/dim]"
    else:
        items = []
        for item_id in state.inventory:
            item = state.get_item_info(item_id)
            items.append(f"[green]{item.name if item else item_id}[/green]")
        inv_text = "  ".join(items)
    console.print(f"[bold]인벤토리:[/bold] {inv_text}")


def render_message(msg: str, style: str = "white") -> None:
    if msg:
        console.print(f"\n[{style}]{msg}[/{style}]\n")


def render_success(msg: str) -> None:
    render_message(msg, style="bold green")


def render_error(msg: str) -> None:
    render_message(msg, style="bold red")


def render_info(msg: str) -> None:
    render_message(msg, style="cyan")


def render_observation(text: str) -> None:
    console.print(
        Panel(text, style="italic dim white", padding=(1, 2))
    )


def render_puzzle_prompt(question: str) -> str:
    console.print(
        Panel(question, title="[bold magenta]??? 퍼즐[/bold magenta]", style="magenta", padding=(1, 2))
    )
    return console.input("[bold magenta]>[/bold magenta] ").strip()


def render_hint(hint: str | None) -> None:
    if hint:
        console.print(
            Panel(f"[italic yellow]{hint}[/italic yellow]", title="[yellow]힌트[/yellow]", style="yellow")
        )
    else:
        console.print("[dim]이 지점에 힌트가 없습니다.[/dim]")


def render_item_description(state: GameState, item_id: str) -> None:
    item = state.get_item_info(item_id)
    if item:
        console.print(
            Panel(
                f"[bold]{item.name}[/bold]\n\n{item.description}",
                style="green",
                padding=(1, 2),
            )
        )
    else:
        render_error(f"알 수 없는 아이템: {item_id}")


def render_help() -> None:
    table = Table(show_header=True, header_style="bold cyan", box=None)
    table.add_column("명령어", style="cyan", no_wrap=True)
    table.add_column("단축키", style="dim")
    table.add_column("설명")
    rows = [
        ("look", "ls, l", "현재 방 묘사 및 조사 가능 지점 목록"),
        ("inspect <id>", "i, cd, ex", "특정 지점 조사"),
        ("use <item>", "u", "아이템 사용 / 설명 확인"),
        ("inv", "inventory", "현재 소지 아이템 목록"),
        ("hint", "h", "현재 퍼즐의 힌트 보기"),
        ("help", "?", "명령어 목록"),
        ("quit", "exit, q", "게임 종료"),
    ]
    for r in rows:
        table.add_row(*r)
    console.print(Panel(table, title="[bold]명령어 목록[/bold]", style="dim"))


def render_clear(state: GameState) -> None:
    elapsed: timedelta = datetime.now() - state.start_time
    minutes, seconds = divmod(int(elapsed.total_seconds()), 60)

    clear_art = """\
  _____  _       _____    _    ____  ___
 / ____|| |     | ____|  / \\  |  _ \\| __|
| |     | |     |  _|   / _ \\ | |_) |  _|
| |____ | |___  | |___ / ___ \\|  _ <| |___
 \\_____||_____| |_____/_/   \\_\\_| \\_\\_____|"""

    console.print()
    console.rule(style="bold green")
    console.print(f"[bold green]{clear_art}[/bold green]", justify="center")
    console.rule(style="bold green")
    console.print(
        Panel(
            f"[bold white]{state.scenario.title}[/bold white]\n\n"
            f"탈출 성공! 모든 단서를 풀고 연구소에서 빠져나왔습니다.\n\n"
            f"[bold cyan]클리어 시간: {minutes:02d}분 {seconds:02d}초[/bold cyan]",
            style="bold green",
            padding=(1, 4),
        )
    )
    console.print()


def prompt() -> str:
    return console.input("[bold white]> [/bold white]").strip()


def clear_screen() -> None:
    console.clear()
