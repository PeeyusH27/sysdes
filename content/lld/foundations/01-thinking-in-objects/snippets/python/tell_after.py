# Tell the member to borrow. The list and its rule stay together, hidden.
class Member:
    def __init__(self, limit=3):
        self.limit = limit
        self._loans = []

    def borrow(self, isbn):
        if len(self._loans) >= self.limit:  # the only place the limit is checked
            return False
        self._loans.append(isbn)
        return True

    def give_back(self, isbn):
        if isbn not in self._loans:
            return False
        self._loans.remove(isbn)
        return True

    @property
    def loans(self):
        return list(self._loans)  # a copy: callers can read, not change
