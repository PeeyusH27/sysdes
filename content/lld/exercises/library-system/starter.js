class Library {
  constructor() {
    
  }

  /** Add copies of a book. */
  addBook(isbn, title, copies) {
    
  }

  /** @param {"standard"|"premium"} tier */
  join(member, tier) {
    
  }

  /** @return {string} a loan id such as "L1", or "UNKNOWN", "LIMIT_REACHED" or "NO_COPY" */
  borrow(member, isbn, day) {
    
  }

  /** @return {number} the fine in cents, or -1 for an unknown or closed loan */
  returnBook(loanId, day) {
    
  }

  /** @return {number} the 1-based place in the queue, or 0 if refused */
  reserve(member, isbn) {
    
  }

  /** @return {number} the new due day, or -1 if refused */
  renew(loanId, day) {
    
  }

  /** Pass on lapsed holds. @return {number} how many holds lapsed */
  sweep(day) {
    
  }

  /** @return {number} copies available now, or -1 for an unknown ISBN */
  available(isbn) {
    
  }

  /** @return {string[]} members waiting, in order */
  queue(isbn) {
    
  }

  /** @return {string[]} members a copy is held for, sorted */
  holds(isbn) {
    
  }

  /** @return {string[]} ISBNs whose title contains the text (ignoring case), sorted */
  search(text) {
    
  }
}
