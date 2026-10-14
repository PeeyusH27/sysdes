import threading
from collections import deque
from dataclasses import dataclass
from typing import Deque, Iterable, List, Mapping, Optional

from models import COINS, CoinBox, Emitter, Inventory, Pending, Slot
from states import STATES, Event, EventType, Rejected, State


@dataclass(frozen=True)
class Result:
    ok: bool
    state: Optional[State] = None
    reason: Optional[str] = None


class VendingMachine(Emitter):
    def __init__(self, slots: Iterable[Slot], coins: Optional[Mapping[int, int]] = None):
        super().__init__()
        self.inventory = Inventory(slots)
        self.box = CoinBox(coins)
        self.state = State.IDLE
        self.escrow: List[int] = []  # the customer's coins: not the machine's money until the sale commits
        self.pending: Optional[Pending] = None  # between "motor on" and the drop sensor
        self._queue: Deque[Event] = deque()
        self._draining = False
        # Coin mech, keypad, drop sensor and service key may be separate threads: one lock plays the
        # part of Node's single thread. An RLock, because a listener that sends mid-transition must
        # be able to queue its event instead of deadlocking.
        self._lock = threading.RLock()

    @property
    def credit(self) -> int:
        return sum(self.escrow)

    def send(self, event: Event) -> Optional[Result]:
        """Every input is one event on one queue, handled in order. None means "queued"."""
        with self._lock:
            self._queue.append(event)
            if self._draining:
                return None  # sent by a listener mid-transition: it runs next, not inside
            self._draining = True
            first = None
            try:
                while self._queue:
                    result = self._handle(self._queue.popleft())
                    if first is None:
                        first = result
            finally:
                self._draining = False
            return first

    def _handle(self, event: Event) -> Result:
        before = self.state
        if event.type is EventType.COIN and event.coin not in COINS:
            return self._reject(event, "coin not accepted")
        handler = STATES[before].get(event.type)
        if handler is None:
            return self._reject(event, f"{event.type.value} not allowed in {before.value}")
        after = handler(self, event)
        if isinstance(after, Rejected):
            return self._reject(event, after.reason)
        self.state = after
        self.emit("transition", before, after, event.type)  # display, telemetry, persistence
        return Result(True, state=after)

    def _reject(self, event: Event, reason: str) -> Result:
        if event.type is EventType.COIN:
            self.emit("returned", [event.coin], "refused")  # drops straight to the cup
        self.emit("rejected", event.type, self.state, reason)
        return Result(False, reason=reason)

    # ---- called by the state table, always inside send()
    def refund(self, why: str) -> None:
        coins, self.escrow = self.escrow, []
        self.emit("returned", coins, why)  # the same coins the customer inserted

    def commit(self) -> None:
        p = self.pending
        assert p is not None, "commit() only runs in the dispensing state"
        self.box.add(self.escrow)  # the escrow becomes the machine's money...
        self.box.remove(p.change)  # ...and the reserved change leaves
        self.escrow, self.pending = [], None
        self.inventory.take(p.code)  # exactly once per sale
        self.emit("returned", p.change, "change")
        self.emit("sale", p.code, p.price)
