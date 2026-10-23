// The four lines you draw, as they look in code.
export class Notifier {
  send(to, text) { return `to ${to}: ${text}`; }
}
export class Book {
  constructor(isbn, title) { this.isbn = isbn; this.title = title; }
}
export class Member {
  constructor(id, name) { this.id = id; this.name = name; }
}
export class Loan {
  constructor(book, member, day) { this.book = book; this.member = member; this.day = day; } // association: knows both, owns neither
}

export class Library {
  constructor() { this.books = []; this.members = []; this.loans = []; }

  addBook(isbn, title) { // composition: created here, lives and dies with this library
    const book = new Book(isbn, title);
    this.books.push(book);
    return book;
  }
  join(member) { this.members.push(member); } // aggregation: made elsewhere, outlives this library

  lend(member, book, day, notifier) { // dependency: the notifier is only used during this call
    const loan = new Loan(book, member, day);
    this.loans.push(loan);
    return notifier.send(member.name, `borrowed ${book.title}`);
  }
}
