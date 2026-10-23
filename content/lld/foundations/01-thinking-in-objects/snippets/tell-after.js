// Tell the member to borrow. The list and its rule stay together, hidden.
export class Member {
  #loans = [];
  constructor(limit = 3) { this.limit = limit; }

  borrow(isbn) {
    if (this.#loans.length >= this.limit) return false; // the only place the limit is checked
    this.#loans.push(isbn);
    return true;
  }

  giveBack(isbn) {
    const i = this.#loans.indexOf(isbn);
    if (i < 0) return false;
    this.#loans.splice(i, 1);
    return true;
  }

  get loans() { return [...this.#loans]; } // a copy: callers can read, not change
}
