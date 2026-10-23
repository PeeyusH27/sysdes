# The rule lives in the callers, so every caller has to remember it.
class Member:
    def __init__(self, limit=3):
        self.limit = limit
        self.loans = []


def borrow_at_desk(member, isbn):
    if len(member.loans) >= member.limit:
        return False
    member.loans.append(isbn)
    return True


def borrow_at_kiosk(member, isbn):
    member.loans.append(isbn)  # someone forgot the limit check, and nothing stops them
    return True
