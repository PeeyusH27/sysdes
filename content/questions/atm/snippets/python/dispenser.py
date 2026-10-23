from typing import Dict, List, Optional

from models import Notes


class NoteHandler:
    """Chain of Responsibility: each handler owns one note value, takes what it can, and hands the rest on."""

    def __init__(self, denom: int, next_handler: "Optional[NoteHandler]" = None):
        self.denom = denom
        self.next = next_handler

    def plan(self, amount: int, stock: Dict[int, int]) -> Optional[Notes]:
        """Notes that add up to exactly `amount`, or None. Try the most notes first, then fewer:
        taking a 50 greedily when you owe 60 from one 50 and three 20s would strand the last 10."""
        most = min(amount // self.denom, stock.get(self.denom, 0))
        for n in range(most, -1, -1):
            rest = amount - n * self.denom
            if self.next is not None:
                tail = self.next.plan(rest, stock)
            else:
                tail = {} if rest == 0 else None
            if tail is not None:
                return {**({self.denom: n} if n else {}), **tail}
        return None


def build_chain(denoms: List[int]) -> Optional[NoteHandler]:
    """A new note value is one more entry in `denoms`; no existing class changes."""
    head = None
    for d in reversed(denoms):
        head = NoteHandler(d, head)
    return head
