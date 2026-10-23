# One class that knows stock, members, loan rules, fees and email.
class Library:
    def __init__(self):
        self.books = {}    # isbn -> {"title", "copies"}
        self.members = {}  # id -> {"name", "loans": [(isbn, day)]}
        self.outbox = []

    def add_book(self, isbn, title, copies):
        self.books[isbn] = {"title": title, "copies": copies}

    def join(self, member_id, name):
        self.members[member_id] = {"name": name, "loans": []}

    def borrow(self, member_id, isbn, day):
        member = self.members.get(member_id)
        book = self.books.get(isbn)
        if member is None or book is None or book["copies"] == 0:
            return False
        if len(member["loans"]) >= 3:  # limit: hard-wired here
            return False
        book["copies"] -= 1
        member["loans"].append((isbn, day))
        self.outbox.append(f"{member['name']}: {book['title']} is due on day {day + 14}")  # 14 days, once
        return True

    def give_back(self, member_id, isbn, day):
        member = self.members.get(member_id)
        loans = member["loans"] if member else []
        i = next((k for k, (b, _) in enumerate(loans) if b == isbn), -1)
        if i < 0:
            return -1
        _, start = loans.pop(i)
        self.books[isbn]["copies"] += 1
        return max(0, day - (start + 14)) * 0.5  # 14 days again, plus the fee rule
