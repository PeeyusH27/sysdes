from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any, Callable, DefaultDict, Dict, Iterable, List, Mapping, Optional, Tuple

# Money is integer cents everywhere: 0.1 + 0.2 is 0.30000000000000004 in floating point,
# and a cash box has to balance to the cent.
COINS: Tuple[int, ...] = (100, 25, 10, 5)  # accepted coins, largest first


@dataclass
class Slot:
    code: str
    product: str
    price: int
    count: int
    capacity: int = 10

    @property
    def sold_out(self) -> bool:  # a property of one slot, not a machine state
        return self.count == 0


class Inventory:
    def __init__(self, slots: Iterable[Slot]):
        self.slots: Dict[str, Slot] = {s.code: s for s in slots}

    def get(self, code: str) -> Optional[Slot]:
        return self.slots.get(code)

    def take(self, code: str) -> None:
        slot = self.slots.get(code)
        if slot is None or slot.sold_out:
            raise RuntimeError(f"Nothing left in {code}")
        slot.count -= 1

    def restock(self, code: str, n: int) -> None:
        slot = self.slots[code]
        slot.count = min(slot.capacity, slot.count + n)


class CoinBox:
    """The change tubes."""

    def __init__(self, counts: Optional[Mapping[int, int]] = None):
        start = counts or {}
        self.counts: Dict[int, int] = {c: start.get(c, 0) for c in COINS}

    def add(self, coins: Iterable[int]) -> None:
        for c in coins:
            self.counts[c] += 1

    def remove(self, coins: Iterable[int]) -> None:
        need = Counter(coins)
        for c, n in need.items():
            if self.counts.get(c, 0) < n:
                raise RuntimeError(f"Only {self.counts.get(c, 0)} × {c}¢ left")
        for c, n in need.items():  # all or nothing
            self.counts[c] -= n

    def counts_with(self, coins: Iterable[int]) -> Dict[int, int]:
        """The counts as if `coins` were added."""
        counts = dict(self.counts)
        for c in coins:
            counts[c] += 1
        return counts

    def total(self) -> int:
        return sum(c * n for c, n in self.counts.items())


@dataclass(frozen=True)
class Pending:
    """A sale between "motor on" and the drop sensor: nothing has moved yet."""
    code: str
    price: int
    change: List[int]


class Emitter:
    """A minimal EventEmitter (Observer): the display, telemetry and tests subscribe by name."""

    def __init__(self) -> None:
        self._handlers: DefaultDict[str, List[Callable[..., Any]]] = defaultdict(list)

    def on(self, event: str, handler: Callable[..., Any]) -> None:
        self._handlers[event].append(handler)

    def emit(self, event: str, *args: Any) -> None:
        for handler in list(self._handlers[event]):
            handler(*args)
