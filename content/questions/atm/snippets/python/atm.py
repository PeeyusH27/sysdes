from typing import Any, Callable, Dict, Iterable, List, Optional

from dispenser import build_chain
from models import NOTES, Account
from states import STATES


class Atm:
    """One Atm is one user at a time, so the Atm itself is not shared between threads.
    What IS shared between machines is the Account, whose methods take a lock."""

    def __init__(self, accounts: Iterable[Account], stock: Dict[int, int], notes: Optional[List[int]] = None,
                 hardware: Optional[Callable[[Dict[int, int]], bool]] = None):
        notes = notes or NOTES
        self.accounts = {a.id: a for a in accounts}
        self.stock = dict(stock)
        self.chain = build_chain(notes)
        self.unit = min(notes)
        self.hardware = hardware or (lambda dispensed: True)  # the cash unit: injected so a test can make it jam
        self.state = "idle"
        self.card: Optional[Account] = None
        self.listeners: List[Callable[[Dict[str, Any]], None]] = []

    def on(self, listener: Callable[[Dict[str, Any]], None]) -> None:  # observer: audit log, receipts, alerts
        self.listeners.append(listener)

    def insert_card(self, id: str): return self.send("insert_card", id=id)
    def enter_pin(self, pin: str): return self.send("enter_pin", pin=pin)
    def withdraw(self, amount: int): return self.send("withdraw", amount=amount)
    def balance(self): return self.send("balance")
    def eject(self): return self.send("eject")

    def send(self, event: str, **args: Any) -> Dict[str, Any]:
        handler = STATES[self.state].get(event)
        if handler is None:
            return self._reject(event, f"{event} not allowed in {self.state}")
        next_state, data = handler(self, args)
        if next_state is None:
            return self._reject(event, data)
        self.state = next_state
        reply = {"ok": True, "state": next_state, **data}
        for listener in self.listeners:
            listener({"type": event, **reply})
        return reply

    def _reject(self, event: str, reason: str) -> Dict[str, Any]:
        for listener in self.listeners:
            listener({"type": event, "ok": False, "reason": reason})
        return {"ok": False, "reason": reason}
