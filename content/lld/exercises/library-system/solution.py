# Fines are a policy: days late -> cents. Wrapping one policy in another adds a rule without editing it.
def per_day(cents):
    return lambda late: max(0, late) * cents


def capped(inner, cap):
    return lambda late: min(cap, inner(late))


# Everything that differs by tier lives in this table. A new tier is one new row.
TIERS = {
    "standard": {"max_loans": 3, "loan_days": 14, "fine": capped(per_day(25), 1000)},
    "premium": {"max_loans": 5, "loan_days": 21, "fine": capped(per_day(10), 500)},
}
HOLD_DAYS = 3


class Copy:
    """A copy is in exactly one state: AVAILABLE, LOANED or HELD (for one member, until a day)."""

    def __init__(self):
        self.state = "AVAILABLE"
        self.held_for = None
        self.hold_until = 0


class Library:
    def __init__(self):
        self.books = {}  # isbn -> {"title", "copies", "queue"}
        self.members = {}  # member -> tier
        self.loans = {}  # id -> dict
        self.next_loan = 1

    def add_book(self, isbn, title, copies):
        book = self.books.setdefault(isbn, {"title": title, "copies": [], "queue": []})
        for _ in range(copies):
            book["copies"].append(Copy())

    def join(self, member, tier):
        self.members[member] = tier

    def borrow(self, member, isbn, day):
        tier = TIERS.get(self.members.get(member))
        book = self.books.get(isbn)
        if tier is None or book is None:
            return "UNKNOWN"
        if self._open_loans(member) >= tier["max_loans"]:
            return "LIMIT_REACHED"
        # A copy held for this member first. A free copy exists only when nobody is waiting,
        # because every return hands the copy to the queue before it can become available.
        copy = next((c for c in book["copies"] if c.state == "HELD" and c.held_for == member), None)
        if copy is None:
            copy = next((c for c in book["copies"] if c.state == "AVAILABLE"), None)
        if copy is None:
            return "NO_COPY"
        copy.state, copy.held_for = "LOANED", None
        loan_id = "L%d" % self.next_loan
        self.next_loan += 1
        self.loans[loan_id] = {"member": member, "isbn": isbn, "copy": copy, "due": day + tier["loan_days"],
                               "renewals": 0, "open": True}
        return loan_id

    def return_book(self, loan_id, day):
        loan = self.loans.get(loan_id)
        if loan is None or not loan["open"]:
            return -1
        loan["open"] = False
        self._release(loan["copy"], self.books[loan["isbn"]], day)
        return TIERS[self.members[loan["member"]]]["fine"](day - loan["due"])

    def reserve(self, member, isbn):
        book = self.books.get(isbn)
        if member not in self.members or book is None:
            return 0
        if any(c.state == "AVAILABLE" for c in book["copies"]):
            return 0
        if member in book["queue"] or any(c.state == "HELD" and c.held_for == member for c in book["copies"]):
            return 0
        book["queue"].append(member)
        return len(book["queue"])

    def renew(self, loan_id, day):
        loan = self.loans.get(loan_id)
        if loan is None or not loan["open"] or day > loan["due"] or loan["renewals"] >= 2:
            return -1
        if self.books[loan["isbn"]]["queue"]:
            return -1
        loan["renewals"] += 1
        loan["due"] += TIERS[self.members[loan["member"]]]["loan_days"]
        return loan["due"]

    def sweep(self, day):
        lapsed = 0
        for book in self.books.values():
            for copy in book["copies"]:
                if copy.state == "HELD" and day > copy.hold_until:
                    lapsed += 1
                    self._release(copy, book, day)
        return lapsed

    def available(self, isbn):
        book = self.books.get(isbn)
        return -1 if book is None else sum(1 for c in book["copies"] if c.state == "AVAILABLE")

    def queue(self, isbn):
        book = self.books.get(isbn)
        return list(book["queue"]) if book else []

    def holds(self, isbn):
        book = self.books.get(isbn)
        return sorted(c.held_for for c in book["copies"] if c.state == "HELD") if book else []

    def search(self, text):
        q = text.lower()
        return sorted(isbn for isbn, b in self.books.items() if q in b["title"].lower())

    def _release(self, copy, book, day):
        """A copy that comes back (or whose hold lapsed) goes to the first member waiting, else it is available."""
        if not book["queue"]:
            copy.state, copy.held_for = "AVAILABLE", None
            return
        copy.state = "HELD"
        copy.held_for = book["queue"].pop(0)
        copy.hold_until = day + HOLD_DAYS

    def _open_loans(self, member):
        return sum(1 for l in self.loans.values() if l["open"] and l["member"] == member)
