# The four lines you draw, as they look in code.
class Notifier:
    def send(self, to, text):
        return f"to {to}: {text}"


class Book:
    def __init__(self, isbn, title):
        self.isbn, self.title = isbn, title


class Member:
    def __init__(self, member_id, name):
        self.id, self.name = member_id, name


class Loan:
    def __init__(self, book, member, day):
        self.book, self.member, self.day = book, member, day  # association: knows both, owns neither


class Library:
    def __init__(self):
        self.books, self.members, self.loans = [], [], []

    def add_book(self, isbn, title):  # composition: created here, lives and dies with this library
        book = Book(isbn, title)
        self.books.append(book)
        return book

    def join(self, member):  # aggregation: made elsewhere, outlives this library
        self.members.append(member)

    def lend(self, member, book, day, notifier):  # dependency: the notifier is only used during this call
        self.loans.append(Loan(book, member, day))
        return notifier.send(member.name, f"borrowed {book.title}")
