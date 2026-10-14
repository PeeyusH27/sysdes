from collections import defaultdict
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, DefaultDict, List


class Dir(Enum):
    UP = "up"
    DOWN = "down"

    @property
    def sign(self) -> int:
        return 1 if self is Dir.UP else -1

    @property
    def opposite(self) -> "Dir":
        return Dir.DOWN if self is Dir.UP else Dir.UP

    @property
    def arrow(self) -> str:
        return "▲" if self is Dir.UP else "▼"


class CarState(Enum):
    IDLE = "IDLE"  # stopped at a floor, doors closed
    MOVING_UP = "MOVING_UP"
    MOVING_DOWN = "MOVING_DOWN"
    DOORS_OPEN = "DOORS_OPEN"  # only ever entered while stopped at a floor
    OUT_OF_SERVICE = "OUT_OF_SERVICE"


@dataclass(frozen=True)
class HallCall:
    """A floor plus the arrow someone pressed. Frozen, so two equal presses hash alike:
    a call is its own dict key."""
    floor: int
    dir: Dir

    @property
    def key(self) -> str:
        return f"{self.floor}{self.dir.arrow}"


@dataclass(frozen=True)
class Stop:
    """What a car reports when it stops at a floor and opens its doors."""
    car_id: str
    floor: int
    dir: Dir


class Emitter:
    """A minimal EventEmitter (Observer): displays, hall lanterns and tests subscribe by name."""

    def __init__(self) -> None:
        self._handlers: DefaultDict[str, List[Callable[..., Any]]] = defaultdict(list)

    def on(self, event: str, handler: Callable[..., Any]) -> None:
        self._handlers[event].append(handler)

    def off(self, event: str, handler: Callable[..., Any]) -> None:
        self._handlers[event].remove(handler)

    def emit(self, event: str, *args: Any) -> None:
        for handler in list(self._handlers[event]):
            handler(*args)
