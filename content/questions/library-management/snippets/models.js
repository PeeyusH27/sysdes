// A copy moves through a small state machine. Anything not listed here is a bug, and fails loudly.
const NEXT = {
  AVAILABLE: ['LOANED'],
  LOANED: ['AVAILABLE', 'HELD', 'LOST'],
  HELD: ['LOANED', 'AVAILABLE', 'HELD'],     // HELD -> HELD: the hold lapsed and passes to the next in line
  LOST: [],
};

export class BookItem {                      // one physical copy
  constructor(id, isbn) {
    Object.assign(this, { id, isbn });
    this.state = 'AVAILABLE';
    this.heldFor = null;                     // member id while HELD
    this.holdUntil = null;
  }
  moveTo(state) {
    if (!NEXT[this.state].includes(state)) throw new Error(`${this.state} -> ${state} is not allowed`);
    this.state = state;
  }
}

export class Book {                          // the title: one record, many copies
  constructor(isbn, title, author) {
    Object.assign(this, { isbn, title, author });
    this.items = [];
    this.queue = [];                         // member ids waiting, oldest first
  }
}

// What differs by kind of member is data, not a subclass.
export const MemberType = {
  STANDARD: { maxLoans: 3, loanDays: 14 },
  PREMIUM: { maxLoans: 5, loanDays: 21 },
};
