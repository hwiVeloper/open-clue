from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Command = Literal[
    "look", "inspect", "use", "inv", "hint", "help", "quit", "talk", "unknown"
]

# 명령어 별칭 매핑
_ALIASES: dict[str, Command] = {
    # look
    "look": "look",
    "ls": "look",
    "l": "look",
    # inspect
    "inspect": "inspect",
    "i": "inspect",
    "cd": "inspect",
    "examine": "inspect",
    "ex": "inspect",
    # use
    "use": "use",
    "u": "use",
    # inventory
    "inv": "inv",
    "inventory": "inv",
    "bag": "inv",
    # hint
    "hint": "hint",
    "h": "hint",
    # help
    "help": "help",
    "?": "help",
    # quit
    "quit": "quit",
    "exit": "quit",
    "q": "quit",
    # talk
    "talk": "talk",
    "t": "talk",
    "speak": "talk",
}


@dataclass
class ParsedCommand:
    command: Command
    target: str | None = None
    raw: str = ""


def parse(input_str: str) -> ParsedCommand:
    raw = input_str.strip()
    parts = raw.split(maxsplit=1)
    if not parts:
        return ParsedCommand(command="unknown", raw=raw)

    verb = parts[0].lower()
    target = parts[1].strip() if len(parts) > 1 else None
    command = _ALIASES.get(verb, "unknown")

    return ParsedCommand(command=command, target=target, raw=raw)
