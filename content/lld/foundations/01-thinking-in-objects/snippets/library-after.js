// Each class owns the facts it knows best. Library only coordinates.
export class Book {
  constructor(isbn, title, copies) { this.isbn = isbn; this.title = title; this.copies = copies; }
  lend() { if (this.copies === 0) return false; this.copies -= 1; return true; }
  restock() { this.copies += 1; }
}

export class Member {
  constructor(id, name, limit = 3, loanDays = 14) {
    this.id = id; this.name = name; this.limit = limit; this.loanDays = loanDays;
    this.loans = [];
  }
  canBorrow() { return this.loans.length < this.limit; }
}

export class Loan {
  constructor(book, member, day) { this.book = book; this.dueDay = day + member.loanDays; }
  feeAt(day) { return Math.max(0, day - this.dueDay) * 0.5; }
}

export class Library {
  books = new Map();
  members = new Map();
  addBook(isbn, title, copies) { this.books.set(isbn, new Book(isbn, title, copies)); }
  join(member) { this.members.set(member.id, member); }

  borrow(memberId, isbn, day) {
    const member = this.members.get(memberId);
    const book = this.books.get(isbn);
    if (!member || !book || !member.canBorrow() || !book.lend()) return null;
    const loan = new Loan(book, member, day);
    member.loans.push(loan);
    return loan;
  }

  giveBack(memberId, isbn, day) {
    const member = this.members.get(memberId);
    const i = member ? member.loans.findIndex((l) => l.book.isbn === isbn) : -1;
    if (i < 0) return -1;
    const [loan] = member.loans.splice(i, 1);
    loan.book.restock();
    return loan.feeAt(day);
  }
}
