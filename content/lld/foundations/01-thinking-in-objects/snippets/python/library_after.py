# Each class owns the facts it knows best. Library only coordinates.
class Book:
    def __init__(self, isbn, title, copies):
        self.isbn, self.title, self.copies = isbn, title, copies

    def lend(self):
        if self.copies == 0:
            return False
        self.copies -= 1
        return True

    def restock(self):
        self.copies += 1


class Member:
    def __init__(self, member_id, name, limit=3, loan_days=14):
        self.id, self.name, self.limit, self.loan_days = member_id, name, limit, loan_days
        self.loans = []

    def can_borrow(self):
        return len(self.loans) < self.limit


class Loan:
    def __init__(self, book, member, day):
        self.book = book
        self.due_day = day + member.loan_days

    def fee_at(self, day):
        return max(0, day - self.due_day) * 0.5


class Library:
    def __init__(self):
        self.books = {}
        self.members = {}

    def add_book(self, isbn, title, copies):
        self.books[isbn] = Book(isbn, title, copies)

    def join(self, member):
        self.members[member.id] = member

    def borrow(self, member_id, isbn, day):
        member = self.members.get(member_id)
        book = self.books.get(isbn)
        if member is None or book is None or not member.can_borrow() or not book.lend():
            return None
        loan = Loan(book, member, day)
        member.loans.append(loan)
        return loan

    def give_back(self, member_id, isbn, day):
        member = self.members.get(member_id)
        loans = member.loans if member else []
        i = next((k for k, loan in enumerate(loans) if loan.book.isbn == isbn), -1)
        if i < 0:
            return -1
        loan = loans.pop(i)
        loan.book.restock()
        return loan.fee_at(day)
