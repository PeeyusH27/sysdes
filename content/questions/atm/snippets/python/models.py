import threading
from dataclasses import dataclass, field
from typing import Dict

NOTES = [100, 50, 20, 10]  # largest first; money is whole dollars in integers, never floats
MAX_PIN_TRIES = 3


@dataclass
class Account:
    id: str
    pin: str
    balance: int
    failed_pins: int = 0  # lives on the account, so two machines share one count
    locked: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False, compare=False)

    @property
    def attempts_left(self) -> int:
        return MAX_PIN_TRIES - self.failed_pins

    def try_pin(self, attempt: str) -> str:
        with self._lock:
            if self.locked:
                return "locked"
            if attempt == self.pin:
                self.failed_pins = 0
                return "ok"
            self.failed_pins += 1
            if self.failed_pins >= MAX_PIN_TRIES:
                self.locked = True
                return "locked"
            return "wrong"

    def debit(self, amount: int) -> bool:
        """Check and subtract in one locked step: two machines cannot both spend the last 50."""
        with self._lock:
            if self.balance < amount:
                return False
            self.balance -= amount
            return True

    def credit(self, amount: int) -> None:
        with self._lock:  # also the undo for a debit when the cash jams
            self.balance += amount


Notes = Dict[int, int]
