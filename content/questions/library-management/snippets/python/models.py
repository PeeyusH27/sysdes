from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Deque, List, Optional


class ItemState(Enum):
    AVAILABLE = "AVAILABLE"
    LOANED = "LOANED"
    HELD = "HELD"
    LOST = "LOST"


# A copy moves through a small state machine. Anything not listed here is a bug, and fails loudly.
NEXT = {
    ItemState.AVAILABLE: {ItemState.LOANED},
    ItemState.LOANED: {ItemState.AVAILABLE, ItemState.HELD, ItemState.LOST},
    ItemState.HELD: {ItemState.LOANED, ItemState.AVAILABLE, ItemState.HELD},  # HELD -> HELD: the hold lapsed, next in line
    ItemState.LOST: set(),
}


class BookItem:
    """One physical copy."""

    def __init__(self, item_id: str, isbn: str):
        self.id = item_id
        self.isbn = isbn
        self.state = ItemState.AVAILABLE
        self.held_for: Optional[str] = None  # member id while HELD
        self.hold_until = 0

    def move_to(self, state: ItemState) -> None:
        if state not in NEXT[self.state]:
            raise ValueError("%s -> %s is not allowed" % (self.state.value, state.value))
        self.state = state


@dataclass
class Book:
    """The title: one record, many copies."""

    isbn: str
    title: str
    author: str
    items: List[BookItem] = field(default_factory=list)
    queue: Deque[str] = field(default_factory=deque)  # member ids waiting, oldest first


class MemberType(Enum):
    # What differs by kind of member is data, not a subclass: (max loans, loan days)
    STANDARD = (3, 14)
    PREMIUM = (5, 21)

    @property
    def max_loans(self) -> int:
        return self.value[0]

    @property
    def loan_days(self) -> int:
        return self.value[1]


@dataclass
class Loan:
    id: str
    item_id: str
    member_id: str
    isbn: str
    due: int
    renewals: int = 0
    open: bool = True
    notified: bool = False
