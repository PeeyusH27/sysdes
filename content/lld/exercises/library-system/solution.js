// Fines are a policy: days late -> cents. Wrapping one policy in another adds a rule without editing it.
const perDay = (cents) => (late) => Math.max(0, late) * cents;
const capped = (inner, cap) => (late) => Math.min(cap, inner(late));

// Everything that differs by tier lives in this table. A new tier is one new row.
const TIERS = {
  standard: { maxLoans: 3, loanDays: 14, fine: capped(perDay(25), 1000) },
  premium: { maxLoans: 5, loanDays: 21, fine: capped(perDay(10), 500) },
};
const HOLD_DAYS = 3;

// A copy is in exactly one state: AVAILABLE, LOANED or HELD (for one member, until a day).
class Copy {
  constructor() {
    this.state = 'AVAILABLE';
    this.heldFor = null;
    this.holdUntil = 0;
  }
}

class Library {
  constructor() {
    this.books = new Map(); // isbn -> { title, copies: Copy[], queue: member[] }
    this.members = new Map(); // member -> tier
    this.loans = new Map(); // id -> { member, isbn, copy, due, renewals, open }
    this.nextLoan = 1;
  }

  addBook(isbn, title, copies) {
    if (!this.books.has(isbn)) this.books.set(isbn, { title, copies: [], queue: [] });
    for (let i = 0; i < copies; i++) this.books.get(isbn).copies.push(new Copy());
  }

  join(member, tier) {
    this.members.set(member, tier);
  }

  borrow(member, isbn, day) {
    const tier = TIERS[this.members.get(member)];
    const book = this.books.get(isbn);
    if (!tier || !book) return 'UNKNOWN';
    if (this.#openLoans(member) >= tier.maxLoans) return 'LIMIT_REACHED';
    // A copy held for this member first. A free copy exists only when nobody is waiting,
    // because every return hands the copy to the queue before it can become available.
    const copy = book.copies.find((c) => c.state === 'HELD' && c.heldFor === member) ?? book.copies.find((c) => c.state === 'AVAILABLE');
    if (!copy) return 'NO_COPY';
    copy.state = 'LOANED';
    copy.heldFor = null;
    const id = `L${this.nextLoan++}`;
    this.loans.set(id, { member, isbn, copy, due: day + tier.loanDays, renewals: 0, open: true });
    return id;
  }

  returnBook(loanId, day) {
    const loan = this.loans.get(loanId);
    if (!loan || !loan.open) return -1;
    loan.open = false;
    this.#release(loan.copy, this.books.get(loan.isbn), day);
    return TIERS[this.members.get(loan.member)].fine(day - loan.due);
  }

  reserve(member, isbn) {
    const book = this.books.get(isbn);
    if (!this.members.has(member) || !book) return 0;
    if (book.copies.some((c) => c.state === 'AVAILABLE')) return 0;
    if (book.queue.includes(member) || book.copies.some((c) => c.state === 'HELD' && c.heldFor === member)) return 0;
    book.queue.push(member);
    return book.queue.length;
  }

  renew(loanId, day) {
    const loan = this.loans.get(loanId);
    if (!loan || !loan.open || day > loan.due || loan.renewals >= 2) return -1;
    if (this.books.get(loan.isbn).queue.length) return -1;
    loan.renewals++;
    loan.due += TIERS[this.members.get(loan.member)].loanDays;
    return loan.due;
  }

  sweep(day) {
    let lapsed = 0;
    for (const book of this.books.values()) {
      for (const copy of book.copies) {
        if (copy.state === 'HELD' && day > copy.holdUntil) {
          lapsed++;
          this.#release(copy, book, day);
        }
      }
    }
    return lapsed;
  }

  available(isbn) {
    const book = this.books.get(isbn);
    return book ? book.copies.filter((c) => c.state === 'AVAILABLE').length : -1;
  }

  queue(isbn) {
    return [...(this.books.get(isbn)?.queue ?? [])];
  }

  holds(isbn) {
    const book = this.books.get(isbn);
    return book ? book.copies.filter((c) => c.state === 'HELD').map((c) => c.heldFor).sort() : [];
  }

  search(text) {
    const q = text.toLowerCase();
    return [...this.books].filter(([, b]) => b.title.toLowerCase().includes(q)).map(([isbn]) => isbn).sort();
  }

  // A copy that comes back (or whose hold lapsed) goes to the first member waiting, else it is available.
  #release(copy, book, day) {
    const next = book.queue.shift();
    if (next === undefined) {
      copy.state = 'AVAILABLE';
      copy.heldFor = null;
      return;
    }
    copy.state = 'HELD';
    copy.heldFor = next;
    copy.holdUntil = day + HOLD_DAYS;
  }

  #openLoans(member) {
    let n = 0;
    for (const l of this.loans.values()) if (l.open && l.member === member) n++;
    return n;
  }
}
