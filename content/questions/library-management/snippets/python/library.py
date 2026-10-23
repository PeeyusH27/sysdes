import threading
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

from fines import CappedFine, FinePolicy, PerDayFine
from models import Book, BookItem, ItemState, Loan, MemberType

HOLD_DAYS = 3


@dataclass(frozen=True)
class Result:
    ok: bool
    value: Any = None
    reason: Optional[str] = None


def success(value: Any = None) -> Result:
    return Result(True, value)


def failure(reason: str) -> Result:
    return Result(False, reason=reason)


@dataclass(frozen=True)
class Event:
    type: str
    member_id: Optional[str]
    isbn: str
    day: int


class Library:
    """Time is always passed in as a day number, so nothing here reads a clock."""

    def __init__(self, fines: Optional[Dict[MemberType, FinePolicy]] = None):
        self.books: Dict[str, Book] = {}  # isbn -> Book
        self.members: Dict[str, MemberType] = {}
        self.loans: Dict[str, Loan] = {}
        self.fines = fines or {  # one policy per member type
            MemberType.STANDARD: CappedFine(PerDayFine(25), 1000),
            MemberType.PREMIUM: CappedFine(PerDayFine(10), 500),
        }
        self._listeners: List[Callable[[Event], None]] = []
        self._next_loan = 1
        # One lock guards every write. Two members racing for the last copy are serialized, so the check
        # "is it AVAILABLE?" and the move to LOANED are one step. A database does the same with
        # UPDATE ... SET state = 'LOANED' WHERE id = ? AND state = 'AVAILABLE'.
        self._lock = threading.RLock()

    def on_event(self, listener: Callable[[Event], None]) -> None:  # observer: email, SMS, the front desk screen
        self._listeners.append(listener)

    def _run(self, body: Callable[[List[Event]], Result]) -> Result:
        """Run a change under the lock, then tell the listeners after releasing it."""
        events: List[Event] = []
        with self._lock:
            result = body(events)
        for e in events:
            for listener in self._listeners:
                listener(e)
        return result

    def add_book(self, isbn: str, title: str, author: str, copies: int) -> None:
        def body(_events):
            book = self.books.setdefault(isbn, Book(isbn, title, author))
            for _ in range(copies):
                book.items.append(BookItem("%s#%d" % (isbn, len(book.items) + 1), isbn))
            return success()
        self._run(body)

    def join(self, member_id: str, member_type: MemberType = MemberType.STANDARD) -> None:
        with self._lock:
            self.members[member_id] = member_type

    def search(self, text: str) -> List[str]:
        q = text.lower()
        with self._lock:
            return [b.isbn for b in self.books.values()
                    if b.isbn == text or q in b.title.lower() or q in b.author.lower()]

    def borrow(self, member_id: str, isbn: str, day: int) -> Result:
        def body(events):
            member_type, book = self.members.get(member_id), self.books.get(isbn)
            if member_type is None or book is None:
                return failure("UNKNOWN")
            if self._open_loans(member_id) >= member_type.max_loans:
                return failure("LIMIT_REACHED")
            # A copy held for this member comes first. A free copy exists only when nobody is waiting,
            # because every return hands the copy to the queue before it can become AVAILABLE.
            item = next((i for i in book.items if i.state is ItemState.HELD and i.held_for == member_id), None)
            if item is None:
                item = next((i for i in book.items if i.state is ItemState.AVAILABLE), None)
            if item is None:
                return failure("NO_COPY")
            item.move_to(ItemState.LOANED)
            item.held_for = None
            loan = Loan("L%d" % self._next_loan, item.id, member_id, isbn, day + member_type.loan_days)
            self._next_loan += 1
            self.loans[loan.id] = loan
            events.append(Event("borrowed", member_id, isbn, day))
            return success(loan)
        return self._run(body)

    def return_item(self, loan_id: str, day: int) -> Result:
        def body(events):
            loan = self.loans.get(loan_id)
            if loan is None or not loan.open:
                return failure("UNKNOWN_LOAN")
            loan.open = False
            fine = self.fines[self.members[loan.member_id]].fine(day - loan.due)
            self._release(self._item_of(loan), day, events)
            events.append(Event("returned", loan.member_id, loan.isbn, day))
            return success(fine)
        return self._run(body)

    def reserve(self, member_id: str, isbn: str) -> Result:
        def body(_events):
            book = self.books.get(isbn)
            if member_id not in self.members or book is None:
                return failure("UNKNOWN")
            if any(i.state is ItemState.AVAILABLE for i in book.items):
                return failure("COPY_AVAILABLE")  # just borrow it
            if member_id in book.queue:
                return failure("ALREADY_WAITING")
            book.queue.append(member_id)
            return success(len(book.queue))  # 1 means next in line
        return self._run(body)

    def renew(self, loan_id: str, day: int) -> Result:
        def body(_events):
            loan = self.loans.get(loan_id)
            if loan is None or not loan.open:
                return failure("UNKNOWN_LOAN")
            if day > loan.due:
                return failure("OVERDUE")
            if loan.renewals >= 2:
                return failure("RENEWAL_LIMIT")
            if self.books[loan.isbn].queue:
                return failure("RESERVED_BY_OTHERS")
            loan.renewals += 1
            loan.due += self.members[loan.member_id].loan_days
            return success(loan.due)
        return self._run(body)

    def sweep(self, day: int) -> None:
        """Call once a day. Overdue notices go out once per loan; unclaimed holds pass to the next in line."""
        def body(events):
            for loan in self.loans.values():
                if loan.open and day > loan.due and not loan.notified:
                    loan.notified = True
                    events.append(Event("overdue", loan.member_id, loan.isbn, day))
            for book in self.books.values():
                for item in book.items:
                    if item.state is ItemState.HELD and day > item.hold_until:
                        events.append(Event("holdExpired", item.held_for, item.isbn, day))
                        self._release(item, day, events)
            return success()
        self._run(body)

    def _release(self, item: BookItem, day: int, events: List[Event]) -> None:
        """A copy that comes back goes to the first member waiting, or becomes available."""
        queue = self.books[item.isbn].queue
        if not queue:
            item.move_to(ItemState.AVAILABLE)
            item.held_for = None
            return
        nxt = queue.popleft()
        item.move_to(ItemState.HELD)
        item.held_for, item.hold_until = nxt, day + HOLD_DAYS
        events.append(Event("ready", nxt, item.isbn, day))

    def _open_loans(self, member_id: str) -> int:
        return sum(1 for l in self.loans.values() if l.open and l.member_id == member_id)

    def _item_of(self, loan: Loan) -> BookItem:
        return next(i for i in self.books[loan.isbn].items if i.id == loan.item_id)
