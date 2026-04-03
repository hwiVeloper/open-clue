from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Callable

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical, ScrollableContainer
from textual.screen import Screen
from textual.widgets import (
    Footer,
    Header,
    Input,
    Label,
    ListItem,
    ListView,
    ProgressBar,
    Static,
)
from textual.reactive import reactive
from textual import work

from clue.schema.models import Scenario
from clue.engine.state import GameState
from clue.engine import mechanics
from clue.engine.parser import parse

# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------

GAME_CSS = """
/* ── 공통 ── */
Screen {
    background: #0d0d0d;
}

/* ── SelectScreen ── */
SelectScreen {
    align: center middle;
}

#select-wrapper {
    width: 72;
    height: auto;
    align: center middle;
}

#logo-text {
    color: #00ff9f;
    text-style: bold;
    width: 100%;
    content-align: center middle;
    border: double #00ff9f;
    padding: 1 2;
    margin-bottom: 1;
}

#select-title {
    color: #888888;
    margin-bottom: 1;
    width: 100%;
    content-align: center middle;
}

#scenario-list {
    width: 100%;
    height: auto;
    max-height: 15;
    background: #111111;
    border: solid #333333;
    margin-bottom: 1;
}

#scenario-list > ListItem {
    padding: 0 2;
    color: #cccccc;
    height: 3;
}

#scenario-list > ListItem.--highlight {
    background: #003322;
    color: #00ff9f;
    text-style: bold;
}

#scenario-list:focus > ListItem.--highlight {
    background: #004433;
    color: #00ff9f;
    text-style: bold;
}

#select-footer {
    color: #444444;
    width: 100%;
    content-align: center middle;
}

/* ── GameScreen ── */
#game-header {
    height: 3;
    background: #001a0d;
    border-bottom: solid #00ff9f;
    layout: horizontal;
    padding: 0 2;
}

#header-title {
    color: #00ff9f;
    text-style: bold;
    width: 1fr;
    content-align: left middle;
}

#header-room {
    color: #ffffff;
    text-style: bold;
    width: 2fr;
    content-align: center middle;
}

#header-timer {
    color: #555555;
    width: 1fr;
    content-align: right middle;
}

#main-area {
    height: 1fr;
    layout: horizontal;
}

/* 좌측 패널 */
#left-panel {
    width: 2fr;
    border-right: solid #222222;
    padding: 1 2;
    overflow-y: auto;
}

#room-name {
    color: #ffcc00;
    text-style: bold;
    margin-bottom: 1;
}

#room-desc {
    color: #aaaaaa;
    margin-bottom: 1;
}

#points-title {
    color: #555555;
    margin-bottom: 0;
}

.point-item {
    color: #cccccc;
    padding: 0 0;
}

.point-locked {
    color: #ff4444;
}

.point-solved {
    color: #00cc66;
}

/* 우측 패널 */
#right-panel {
    width: 1fr;
    layout: vertical;
    border-left: solid #222222;
}

#cmd-panel {
    height: 1fr;
    border-bottom: solid #222222;
    padding: 1 2;
}

#cmd-title {
    color: #555555;
    margin-bottom: 1;
}

.cmd-row {
    layout: horizontal;
    height: 1;
}

.cmd-key {
    color: #00ff9f;
    width: 10;
    text-style: bold;
}

.cmd-desc {
    color: #666666;
}

#inv-panel {
    height: 1fr;
    padding: 1 2;
}

#inv-title {
    color: #555555;
    margin-bottom: 1;
}

.inv-item {
    color: #66ff99;
}

#inv-empty {
    color: #333333;
}

/* 메시지 로그 */
#log-area {
    height: 8;
    border-top: solid #222222;
    border-bottom: solid #222222;
    padding: 0 2;
    overflow-y: auto;
    background: #080808;
}

.log-normal  { color: #888888; }
.log-success { color: #00ff9f; text-style: bold; }
.log-error   { color: #ff4444; }
.log-info    { color: #4499ff; }
.log-item    { color: #66ff99; text-style: bold; }
.log-puzzle  { color: #cc88ff; }
.log-observe { color: #ccaa44; }

/* 타임어택 타이머 바 */
#puzzle-timer-bar {
    height: 1;
    margin: 0 2;
    display: none;
}

/* 입력창 */
#input-area {
    height: 3;
    layout: horizontal;
    background: #0d0d0d;
    padding: 0 2;
    border-top: solid #333333;
}

#input-prompt {
    color: #00ff9f;
    text-style: bold;
    width: auto;
    content-align: left middle;
    padding-right: 1;
}

#cmd-input {
    width: 1fr;
    background: #0d0d0d;
    border: none;
    color: #ffffff;
}

#cmd-input:focus {
    border: none;
}

/* 클리어 오버레이 */
#clear-screen {
    align: center middle;
    width: 100%;
    height: 100%;
    background: #000000 80%;
}

#clear-box {
    width: 60;
    border: double #00ff9f;
    padding: 2 4;
    background: #001a0d;
    content-align: center middle;
}

#clear-art {
    color: #00ff9f;
    text-style: bold;
    text-align: center;
    margin-bottom: 1;
}

#clear-msg {
    color: #ffffff;
    text-align: center;
    margin-bottom: 1;
}

#clear-time {
    color: #ffcc00;
    text-style: bold;
    text-align: center;
}
"""

LOGO = """\
  ___                    ____ _
 / _ \\ _ __   ___ _ __  / ___| |_   _  ___
| | | | '_ \\ / _ \\ '_ \\| |   | | | | |/ _ \\
| |_| | |_) |  __/ | | | |___| | |_| |  __/
 \\___/| .__/ \\___|_| |_|\\____|_|\\__,_|\\___|
      |_|"""

CLEAR_ART = """\
  ___ _    ___ _   ___  ___   _
 / __| |  | __/_\\ | _ \\| __| | |
| (__| |__| _/ _ \\|   /| _|  |_|
 \\___|____|___/_/ \\_\\_\\|___| (_)"""


# ---------------------------------------------------------------------------
# Scenario info helper
# ---------------------------------------------------------------------------

def _load_scenario_info(path: Path) -> dict:
    """파일에서 title, difficulty, estimated_minutes만 빠르게 읽기."""
    try:
        if path.suffix == ".json":
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            from clue.cipher.decrypt import decrypt_scenario
            data = decrypt_scenario(path)
        return {
            "title": data.get("title", path.stem),
            "difficulty": data.get("difficulty", 0),
            "estimated_minutes": data.get("estimated_minutes"),
            "path": path,
        }
    except Exception:
        return {"title": path.stem, "difficulty": 0, "estimated_minutes": None, "path": path}


def _star(n: int) -> str:
    n = max(0, min(5, n or 0))
    return "★" * n + "☆" * (5 - n)


# ---------------------------------------------------------------------------
# SelectScreen
# ---------------------------------------------------------------------------

class SelectScreen(Screen):
    BINDINGS = [
        Binding("q", "quit", "종료"),
        Binding("escape", "quit", "종료"),
    ]

    def __init__(self, scenario_infos: list[dict], on_select: Callable[[Path], None]):
        super().__init__()
        self._infos = scenario_infos
        self._on_select = on_select

    def compose(self) -> ComposeResult:
        with Vertical(id="select-wrapper"):
            yield Static(LOGO, id="logo-text")
            yield Static("Terminal Escape Room Engine", id="select-title")
            items = []
            for info in self._infos:
                stars = _star(info["difficulty"])
                mins = f"  ~{info['estimated_minutes']}분" if info["estimated_minutes"] else ""
                label = f"{info['title']}\n  {stars}{mins}"
                items.append(ListItem(Label(label)))
            yield ListView(*items, id="scenario-list")
            yield Static("↑ ↓  이동     Enter  선택     q  종료", id="select-footer")

    def on_mount(self) -> None:
        # ListView에 포커스를 주어야 키보드 입력이 동작함
        self.query_one("#scenario-list", ListView).focus()

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        idx = event.list_view.index
        if idx is not None and 0 <= idx < len(self._infos):
            self._on_select(self._infos[idx]["path"])

    def action_quit(self) -> None:
        self.app.exit()


# ---------------------------------------------------------------------------
# GameScreen
# ---------------------------------------------------------------------------

class GameScreen(Screen):
    BINDINGS = [
        Binding("ctrl+q", "quit_game", "종료"),
    ]

    _elapsed: reactive[str] = reactive("00:00")

    def __init__(self, state: GameState):
        super().__init__()
        self._state = state
        self._log_lines: list[tuple[str, str]] = []  # (text, css_class)
        self._puzzle_mode = False
        self._current_puzzle_point_id: str | None = None
        self._puzzle_time_limit: int | None = None
        self._puzzle_time_remaining: int = 0
        self._puzzle_timer_handle = None

    # ------------------------------------------------------------------ compose
    def compose(self) -> ComposeResult:
        # 헤더
        with Horizontal(id="game-header"):
            yield Static("OpenClue", id="header-title")
            yield Static("", id="header-room")
            yield Static("00:00", id="header-timer")

        with Horizontal(id="main-area"):
            # 좌측: 방 + 포인트
            with Vertical(id="left-panel"):
                yield Static("", id="room-name")
                yield Static("", id="room-desc")
                yield Static("[ 조사 가능한 지점 ]", id="points-title")
                yield Static("", id="points-list")

            # 우측: 명령어 + 인벤토리
            with Vertical(id="right-panel"):
                with Vertical(id="cmd-panel"):
                    yield Static("[ 명령어 ]", id="cmd-title")
                    for key, desc in [
                        ("look", "방 전체 보기"),
                        ("inspect <id>", "지점 조사"),
                        ("use <id>", "아이템 확인"),
                        ("inv", "소지품 목록"),
                        ("hint", "퍼즐 힌트"),
                        ("help", "도움말"),
                        ("quit / Ctrl+Q", "종료"),
                    ]:
                        with Horizontal(classes="cmd-row"):
                            yield Static(key, classes="cmd-key")
                            yield Static(desc, classes="cmd-desc")
                with Vertical(id="inv-panel"):
                    yield Static("[ 인벤토리 ]", id="inv-title")
                    yield Static("없음", id="inv-empty")
                    yield Vertical(id="inv-list")

        # 메시지 로그
        with ScrollableContainer(id="log-area"):
            yield Static("", id="log-content")

        # 타임어택 타이머 바 (기본 숨김)
        yield ProgressBar(total=100, show_eta=False, show_percentage=False, id="puzzle-timer-bar")

        # 입력창
        with Horizontal(id="input-area"):
            yield Static(">", id="input-prompt")
            yield Input(placeholder="command...", id="cmd-input")

    # ------------------------------------------------------------------ mount
    def on_mount(self) -> None:
        self._refresh_room()
        self._log("게임을 시작합니다. look 으로 주변을 살펴보세요.", "log-info")
        cmd_input = self.query_one("#cmd-input", Input)
        cmd_input.cursor_blink = False
        cmd_input.focus()
        self.set_interval(1, self._tick_timer)

    # ------------------------------------------------------------------ timer
    def _tick_timer(self) -> None:
        try:
            elapsed = datetime.now() - self._state.start_time
            total = int(elapsed.total_seconds())
            m, s = divmod(total, 60)
            self.query_one("#header-timer", Static).update(f"경과: {m:02d}:{s:02d}")
        except Exception:
            pass

    # ------------------------------------------------------------------ input
    def on_input_submitted(self, event: Input.Submitted) -> None:
        raw = event.value.strip()
        event.input.value = ""
        if not raw:
            return

        if self._puzzle_mode:
            self._handle_puzzle_answer(raw)
        else:
            self._handle_command(raw)

    # ------------------------------------------------------------------ commands
    def _handle_command(self, raw: str) -> None:
        cmd = parse(raw)

        if cmd.command == "look":
            self._refresh_room()
            self._log(f"> {raw}", "log-normal")

        elif cmd.command == "inspect":
            self._log(f"> {raw}", "log-normal")
            if not cmd.target:
                self._log("inspect 뒤에 지점 ID를 입력하세요. (예: inspect bed)", "log-error")
                return
            point = self._state.get_point_in_room(cmd.target)
            if point is None:
                self._log(f"'{cmd.target}'을(를) 현재 방에서 찾을 수 없습니다.", "log-error")
                return
            ok, reason = self._state.check_requirements(point)
            if not ok:
                self._log(reason, "log-error")
                return
            if point.observation:
                self._log(point.observation, "log-observe")
            if point.action and not point.puzzle:
                results = mechanics.execute_actions(self._state, point.action)
                for r in results:
                    if r.item_gained:
                        self._log(r.message, "log-item")
                        self._refresh_inventory()
                    elif r.message:
                        self._log(r.message, "log-info")
                    if r.moved:
                        self._refresh_room()
                    if r.cleared:
                        self._show_clear()
            elif point.puzzle:
                can, reason = mechanics.can_attempt_puzzle(self._state, point)
                if not can:
                    self._log(reason, "log-error")
                    return
                self._enter_puzzle_mode(point.id, point.puzzle.question, point.puzzle.time_limit_seconds)
            elif not point.observation:
                self._log("특별한 것을 발견하지 못했습니다.", "log-normal")

        elif cmd.command == "use":
            self._log(f"> {raw}", "log-normal")
            if not cmd.target:
                self._log("use 뒤에 아이템 ID를 입력하세요.", "log-error")
                return
            if not self._state.has_item(cmd.target):
                self._log(f"'{cmd.target}'을(를) 가지고 있지 않습니다.", "log-error")
                return
            item = self._state.get_item_info(cmd.target)
            if item:
                self._log(f"[{item.name}] {item.description}", "log-info")

        elif cmd.command == "inv":
            self._log(f"> {raw}", "log-normal")
            if not self._state.inventory:
                self._log("소지품이 없습니다.", "log-normal")
            else:
                for item_id in self._state.inventory:
                    item = self._state.get_item_info(item_id)
                    if item:
                        self._log(f"  [{item.name}] {item.description}", "log-item")

        elif cmd.command == "hint":
            self._log(f"> {raw}", "log-normal")
            for p in self._state.current_room().points:
                if p.puzzle and p.id not in self._state.solved_puzzles:
                    hint = p.puzzle.hint
                    self._log(hint if hint else "힌트가 없습니다.", "log-puzzle")
                    return
            self._log("현재 방에 풀어야 할 퍼즐이 없습니다.", "log-normal")

        elif cmd.command == "help":
            self._log(f"> {raw}", "log-normal")
            self._log("look | inspect <id> | use <id> | inv | hint | quit", "log-info")

        elif cmd.command == "quit":
            self.app.exit()

        else:
            self._log(f"알 수 없는 명령어: '{raw}' — help 를 입력해보세요.", "log-error")

    # ------------------------------------------------------------------ puzzle
    def _enter_puzzle_mode(self, point_id: str, question: str, time_limit: int | None = None) -> None:
        self._puzzle_mode = True
        self._current_puzzle_point_id = point_id
        self._log("[ 퍼즐 ]", "log-puzzle")
        for line in question.splitlines():
            self._log(line, "log-puzzle")
        if time_limit:
            self._puzzle_time_limit = time_limit
            self._puzzle_time_remaining = time_limit
            self._log(f"제한 시간: {time_limit}초", "log-error")
            bar = self.query_one("#puzzle-timer-bar", ProgressBar)
            bar.update(total=time_limit, progress=time_limit)
            bar.display = True
            self._puzzle_timer_handle = self.set_interval(1, self._tick_puzzle_timer)
        input_widget = self.query_one("#cmd-input", Input)
        input_widget.placeholder = "answer..."
        self.query_one("#input-prompt", Static).update("[?]")

    def _tick_puzzle_timer(self) -> None:
        self._puzzle_time_remaining -= 1
        bar = self.query_one("#puzzle-timer-bar", ProgressBar)
        bar.update(progress=self._puzzle_time_remaining)
        if self._puzzle_time_remaining <= 0:
            point = self._state.get_point_in_room(self._current_puzzle_point_id)
            fail_msg = (
                point.puzzle.fail_message
                if point and point.puzzle and point.puzzle.fail_message
                else "시간 초과! 퍼즐에 실패했습니다."
            )
            self._exit_puzzle_mode()
            self._log(fail_msg, "log-error")

    def _handle_puzzle_answer(self, raw: str) -> None:
        point = self._state.get_point_in_room(self._current_puzzle_point_id)
        if point is None:
            self._exit_puzzle_mode()
            return

        self._log(f"  >> {raw}", "log-normal")
        success, msg = mechanics.attempt_puzzle(self._state, point, raw)

        if success:
            self._exit_puzzle_mode()
            self._log(msg, "log-success")
            self._refresh_inventory()
            if self._state.cleared:
                self._show_clear()
            else:
                self._refresh_room()
        else:
            self._log(msg, "log-error")
            # 시도 초과 시 자동 퍼즐 모드 해제
            if point.puzzle and point.puzzle.max_attempts:
                if self._state.get_attempts(point.id) >= point.puzzle.max_attempts:
                    self._exit_puzzle_mode()

    def _exit_puzzle_mode(self) -> None:
        self._puzzle_mode = False
        self._current_puzzle_point_id = None
        if self._puzzle_timer_handle is not None:
            self._puzzle_timer_handle.stop()
            self._puzzle_timer_handle = None
        self._puzzle_time_limit = None
        bar = self.query_one("#puzzle-timer-bar", ProgressBar)
        bar.display = False
        self.query_one("#cmd-input", Input).placeholder = "command..."
        self.query_one("#input-prompt", Static).update(">")

    # ------------------------------------------------------------------ refresh
    def _refresh_room(self) -> None:
        room = self._state.current_room()
        scenario_title = self._state.scenario.title

        self.query_one("#header-room", Static).update(
            f"{scenario_title}  >  {room.name}"
        )
        self.query_one("#room-name", Static).update(f"[ {room.name} ]")
        self.query_one("#room-desc", Static).update(room.description)

        # 포인트 목록 — 한글은 터미널에서 2셀 너비이므로 고정폭 패딩 대신 탭 구분 사용
        lines = []
        for p in self._state.visible_points():
            if p.puzzle and p.id not in self._state.solved_puzzles:
                lines.append(f"  - {p.name}  ({p.id})  [잠김]")
            elif p.id in self._state.solved_puzzles and p.puzzle:
                lines.append(f"  - {p.name}  ({p.id})  [완료]")
            else:
                lines.append(f"  - {p.name}  ({p.id})")
        self.query_one("#points-list", Static).update("\n".join(lines) if lines else "  (없음)")

    def _refresh_inventory(self) -> None:
        inv_list = self.query_one("#inv-list", Vertical)
        inv_empty = self.query_one("#inv-empty", Static)
        inv_list.remove_children()

        if not self._state.inventory:
            inv_empty.display = True
        else:
            inv_empty.display = False
            for item_id in self._state.inventory:
                item = self._state.get_item_info(item_id)
                name = item.name if item else item_id
                inv_list.mount(Static(f"  • {name}", classes="inv-item"))

    # ------------------------------------------------------------------ log
    def _log(self, text: str, css_class: str = "log-normal") -> None:
        self._log_lines.append((text, css_class))
        # 최근 50줄만 유지
        if len(self._log_lines) > 50:
            self._log_lines = self._log_lines[-50:]
        self._render_log()

    def _render_log(self) -> None:
        content = self.query_one("#log-content", Static)
        from rich.text import Text
        t = Text()
        style_map = {
            "log-normal":  "#888888",
            "log-success": "bold #00ff9f",
            "log-error":   "#ff4444",
            "log-info":    "#4499ff",
            "log-item":    "bold #66ff99",
            "log-puzzle":  "#cc88ff",
            "log-observe": "#ccaa44",
        }
        for text, css in self._log_lines:
            style = style_map.get(css, "#888888")
            t.append(text + "\n", style=style)
        content.update(t)
        # 스크롤 하단 고정 — 리사이즈 중 레이아웃 재계산과 충돌하지 않도록 지연
        log_area = self.query_one("#log-area", ScrollableContainer)
        log_area.call_after_refresh(log_area.scroll_end, animate=False)

    # ------------------------------------------------------------------ clear
    def _show_clear(self) -> None:
        elapsed = datetime.now() - self._state.start_time
        total = int(elapsed.total_seconds())
        m, s = divmod(total, 60)
        self.app.push_screen(ClearScreen(self._state.scenario.title, m, s))

    def action_quit_game(self) -> None:
        self.app.exit()


# ---------------------------------------------------------------------------
# ClearScreen
# ---------------------------------------------------------------------------

class ClearScreen(Screen):
    BINDINGS = [Binding("enter,q,escape", "done", "나가기")]

    def __init__(self, title: str, minutes: int, seconds: int):
        super().__init__()
        self._title = title
        self._minutes = minutes
        self._seconds = seconds

    def compose(self) -> ComposeResult:
        with Vertical(id="clear-screen"):
            with Vertical(id="clear-box"):
                yield Static(CLEAR_ART, id="clear-art")
                yield Static(
                    f"{self._title}\n\n탈출 성공! 모든 단서를 풀고 빠져나왔습니다.",
                    id="clear-msg",
                )
                yield Static(
                    f"클리어 시간: {self._minutes:02d}분 {self._seconds:02d}초",
                    id="clear-time",
                )
                yield Static("\n[Enter / q] 종료", classes="log-normal")

    def action_done(self) -> None:
        self.app.exit()


# ---------------------------------------------------------------------------
# Main App
# ---------------------------------------------------------------------------

class OpenClueApp(App):
    CSS = GAME_CSS

    def __init__(self, scenario_paths: list[Path]):
        super().__init__()
        self._scenario_paths = scenario_paths

    def on_mount(self) -> None:
        if len(self._scenario_paths) == 1:
            self._start_game(self._scenario_paths[0])
        else:
            infos = [_load_scenario_info(p) for p in self._scenario_paths]
            self.push_screen(SelectScreen(infos, self._start_game))

    def _start_game(self, path: Path) -> None:
        try:
            if path.suffix == ".json":
                data = json.loads(path.read_text(encoding="utf-8"))
            else:
                from clue.cipher.decrypt import decrypt_scenario
                data = decrypt_scenario(path)
        except Exception as e:
            self.exit(message=str(e))
            return

        scenario = Scenario.model_validate(data)
        state = GameState.from_scenario(scenario)
        self.push_screen(GameScreen(state))
