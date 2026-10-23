import random
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Dict, List, Optional


class Event(Enum):
    MOVE = "move"
    LADDER = "ladder"
    SNAKE = "snake"
    STAY = "stay"
    WIN = "win"


@dataclass(frozen=True)
class MoveResult:
    player: str
    roll: int
    from_: int
    to: int
    event: Event


class Board:
    """A snake and a ladder are the same thing pointing different ways, so the board stores one dict of jumps."""

    def __init__(self, size: int, jumps: Dict[int, int]):  # e.g. {4: 14, 17: 7}
        for start, end in jumps.items():
            if start < 1 or start >= size:
                raise ValueError(f"a jump cannot start on {start}")  # never on the last square
            if end < 1 or end > size or end == start:
                raise ValueError(f"bad jump {start} -> {end}")
            if end in jumps:
                raise ValueError(f"{start} lands on the start of another jump")  # no chains, so no cycles
        self.size = size
        self.jumps = dict(jumps)

    def land(self, square: int) -> int:
        return self.jumps.get(square, square)

    def kind_at(self, square: int) -> Event:
        end = self.jumps.get(square)
        if end is None:
            return Event.MOVE
        return Event.LADDER if end > square else Event.SNAKE


# Strategy 1: where the roll comes from. The game never knows if it is random.
class RandomDice:
    def __init__(self, rng: Optional[random.Random] = None, sides: int = 6):
        self._rng = rng or random.Random()
        self._sides = sides

    def roll(self) -> int:
        return self._rng.randint(1, self._sides)


class FixedDice:
    """For tests and demos: the same rolls, in order, then again."""

    def __init__(self, *rolls: int):
        self._rolls = list(rolls)
        self._next = 0

    def roll(self) -> int:
        value = self._rolls[self._next % len(self._rolls)]
        self._next += 1
        return value


# Strategy 2: how the last square is reached. A rule maps (position, roll, size) to a square, or None if the move is refused.
Rule = Callable[[int, int, int], Optional[int]]


def exact(pos: int, roll: int, size: int) -> Optional[int]:  # must land on the last square
    return None if pos + roll > size else pos + roll


def finish(pos: int, roll: int, size: int) -> Optional[int]:  # any roll that reaches it wins
    return min(pos + roll, size)


def bounce(pos: int, roll: int, size: int) -> Optional[int]:  # the extra steps walk back
    target = pos + roll
    return size - (target - size) if target > size else target
