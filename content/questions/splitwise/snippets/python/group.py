import threading
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence

from ledger import Ledger
from splits import SPLITS


class Group:
    def __init__(self, members: Iterable[str]):
        self.members = set(members)
        self.ledger = Ledger()
        self.expenses: List[Dict[str, Any]] = []
        self._listeners: List[Callable[[Dict[str, Any]], None]] = []
        self._lock = threading.Lock()  # one lock per group: a settle-up cannot interleave with an expense

    def on(self, listener: Callable[[Dict[str, Any]], None]) -> None:  # observer: push notifications, activity feed
        self._listeners.append(listener)

    def add_expense(self, payer: str, amount: int, kind: str, users: Sequence[str], data: Sequence[int] = ()) -> Dict[str, Any]:
        with self._lock:
            split = SPLITS.get(kind)
            known = payer in self.members and all(u in self.members for u in users)
            if split is None or not known or not users or len(set(users)) != len(users):
                return {"ok": False, "reason": "invalid participants"}
            if not isinstance(amount, int) or amount <= 0:
                return {"ok": False, "reason": "invalid amount"}
            shares = split(amount, users, data)  # validate first: a bad expense never half-applies
            if shares is None:
                return {"ok": False, "reason": f"invalid {kind} split"}
            for user, share in zip(users, shares):
                self.ledger.add(user, payer, share)  # every participant owes the payer their share
            self.expenses.append({"payer": payer, "amount": amount, "kind": kind, "shares": shares})
            result = {"ok": True, "shares": dict(zip(users, shares))}
        self._emit({"type": "expense", "payer": payer, "amount": amount, "shares": shares})  # after unlocking
        return result

    def settle_up(self, source: str, to: str, cents: int) -> Dict[str, Any]:
        with self._lock:
            # check and subtract in one locked step: two racing settle-ups cannot both pay the same debt
            if source not in self.members or to not in self.members or not self.ledger.settle(source, to, cents):
                return {"ok": False, "reason": "nothing to settle"}
        self._emit({"type": "settled", "from": source, "to": to, "cents": cents})
        return {"ok": True}

    def _emit(self, event: Dict[str, Any]) -> None:
        for listener in self._listeners:
            listener(event)

    def owes(self, source: str, to: str) -> int:
        with self._lock:
            return self.ledger.owes(source, to)

    def balances(self) -> Dict[str, int]:
        with self._lock:
            return self.ledger.balances()

    def simplify(self):
        with self._lock:
            return self.ledger.simplify()
