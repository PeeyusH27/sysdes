// One class that knows stock, members, loan rules, fees and email.
export class Library {
  constructor() {
    this.books = new Map(); // isbn -> { title, copies }
    this.members = new Map(); // id -> { name, loans: [{ isbn, day }] }
    this.outbox = [];
  }
  addBook(isbn, title, copies) { this.books.set(isbn, { title, copies }); }
  join(id, name) { this.members.set(id, { name, loans: [] }); }

  borrow(memberId, isbn, day) {
    const member = this.members.get(memberId);
    const book = this.books.get(isbn);
    if (!member || !book || book.copies === 0) return false;
    if (member.loans.length >= 3) return false; // limit: hard-wired here
    book.copies -= 1;
    member.loans.push({ isbn, day });
    this.outbox.push(`${member.name}: ${book.title} is due on day ${day + 14}`); // 14 days, once
    return true;
  }

  giveBack(memberId, isbn, day) {
    const member = this.members.get(memberId);
    const i = member ? member.loans.findIndex((l) => l.isbn === isbn) : -1;
    if (i < 0) return -1;
    const [loan] = member.loans.splice(i, 1);
    this.books.get(isbn).copies += 1;
    return Math.max(0, day - (loan.day + 14)) * 0.5; // 14 days again, plus the fee rule
  }
}
