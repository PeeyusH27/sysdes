import { Book, BookItem, MemberType } from './models.js';
import { CappedFine, PerDayFine } from './fines.js';

const HOLD_DAYS = 3;
const ok = value => ({ ok: true, value });
const fail = reason => ({ ok: false, reason });

// Time is always passed in as a day number, so nothing here reads a clock.
export class Library {
  constructor({ fines } = {}) {
    this.books = new Map();                  // isbn -> Book (also the search index for ISBN lookups)
    this.members = new Map();
    this.loans = new Map();
    this.fines = fines ?? {                  // one policy per member type
      STANDARD: new CappedFine(new PerDayFine(25), 1000),
      PREMIUM: new CappedFine(new PerDayFine(10), 500),
    };
    this.listeners = [];
    this.nextLoan = 1;
  }

  on(listener) { this.listeners.push(listener); }          // observer: email, SMS, the front desk screen
  #emit(type, data) { for (const l of this.listeners) l({ type, ...data }); }

  addBook(isbn, title, author, copies) {
    const book = this.books.get(isbn) ?? new Book(isbn, title, author);
    for (let i = 0; i < copies; i++) book.items.push(new BookItem(`${isbn}#${book.items.length + 1}`, isbn));
    this.books.set(isbn, book);
  }

  join(memberId, type = 'STANDARD') { this.members.set(memberId, { id: memberId, type }); }

  search(text) {
    const q = text.toLowerCase();
    return [...this.books.values()]
      .filter(b => b.isbn === text || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .map(b => b.isbn);
  }

  borrow(memberId, isbn, day) {
    const member = this.members.get(memberId);
    const book = this.books.get(isbn);
    if (!member || !book) return fail('UNKNOWN');
    const rules = MemberType[member.type];
    if (this.#open(memberId).length >= rules.maxLoans) return fail('LIMIT_REACHED');
    // A copy held for this member comes first. A free copy exists only when nobody is waiting,
    // because every return hands the copy to the queue before it can become AVAILABLE.
    const item = book.items.find(i => i.state === 'HELD' && i.heldFor === memberId)
      ?? book.items.find(i => i.state === 'AVAILABLE');
    if (!item) return fail('NO_COPY');
    item.moveTo('LOANED');                   // the one atomic step: two members cannot both win this copy
    item.heldFor = null;
    const loan = { id: `L${this.nextLoan++}`, itemId: item.id, memberId, isbn, day, due: day + rules.loanDays, renewals: 0, returned: null, notified: false };
    this.loans.set(loan.id, loan);
    this.#emit('borrowed', { memberId, isbn, day });
    return ok(loan);
  }

  returnItem(loanId, day) {
    const loan = this.loans.get(loanId);
    if (!loan || loan.returned !== null) return fail('UNKNOWN_LOAN');
    loan.returned = day;
    const fine = this.fines[this.members.get(loan.memberId).type].fine(day - loan.due);
    this.#release(this.#item(loan), day);
    this.#emit('returned', { memberId: loan.memberId, isbn: loan.isbn, day, fine });
    return ok(fine);
  }

  reserve(memberId, isbn) {
    const book = this.books.get(isbn);
    if (!this.members.has(memberId) || !book) return fail('UNKNOWN');
    if (book.items.some(i => i.state === 'AVAILABLE')) return fail('COPY_AVAILABLE');   // just borrow it
    if (book.queue.includes(memberId)) return fail('ALREADY_WAITING');
    book.queue.push(memberId);
    return ok(book.queue.length);            // 1 means next in line
  }

  renew(loanId, day) {
    const loan = this.loans.get(loanId);
    if (!loan || loan.returned !== null) return fail('UNKNOWN_LOAN');
    if (day > loan.due) return fail('OVERDUE');
    if (loan.renewals >= 2) return fail('RENEWAL_LIMIT');
    if (this.books.get(loan.isbn).queue.length) return fail('RESERVED_BY_OTHERS');
    loan.renewals++;
    loan.due += MemberType[this.members.get(loan.memberId).type].loanDays;
    return ok(loan.due);
  }

  // Call once a day. Overdue notices go out once per loan; unclaimed holds pass to the next in line.
  sweep(day) {
    for (const loan of this.loans.values()) {
      if (loan.returned === null && day > loan.due && !loan.notified) {
        loan.notified = true;
        this.#emit('overdue', { memberId: loan.memberId, isbn: loan.isbn, day });
      }
    }
    for (const book of this.books.values()) {
      for (const item of book.items) {
        if (item.state === 'HELD' && day > item.holdUntil) {
          this.#emit('holdExpired', { memberId: item.heldFor, isbn: item.isbn, day });
          this.#release(item, day);
        }
      }
    }
  }

  // A copy that comes back goes to the first member waiting, or becomes available.
  #release(item, day) {
    const book = this.books.get(item.isbn);
    const next = book.queue.shift();
    if (next === undefined) {
      item.moveTo('AVAILABLE');
      item.heldFor = item.holdUntil = null;
      return;
    }
    item.moveTo('HELD');
    item.heldFor = next;
    item.holdUntil = day + HOLD_DAYS;
    this.#emit('ready', { memberId: next, isbn: item.isbn, day });
  }

  #open(memberId) { return [...this.loans.values()].filter(l => l.memberId === memberId && l.returned === null); }
  #item(loan) { return this.books.get(loan.isbn).items.find(i => i.id === loan.itemId); }
}
