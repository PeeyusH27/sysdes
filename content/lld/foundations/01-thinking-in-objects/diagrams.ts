import type { ClassSpec } from "@/components/diagram/types";

export const libraryGrowth: ClassSpec = {
  id: "library-growth",
  title: "A library design, grown in four stages",
  description:
    "Stage one is a single class that does everything. Each later stage pulls out a noun, then a relationship that carries data, then a collaborator the library is handed. Library composes Book, aggregates Member, Member composes Loan, Loan refers to a Book, and Library depends on a Notifier only while it sends.",
  classes: [
    { id: "notifier", name: "Notifier", col: 1, row: 0, methods: ["send(to, text)"] },
    {
      id: "library",
      name: "Library",
      col: 1,
      row: 1,
      fields: ["books: Map<isbn, Book>", "members: Map<id, Member>"],
      methods: ["borrow(memberId, isbn, day)", "giveBack(memberId, isbn, day)"],
    },
    { id: "member", name: "Member", col: 2, row: 1, fields: ["limit: number", "loanDays: number", "loans: Loan[]"], methods: ["canBorrow()"] },
    { id: "book", name: "Book", col: 1, row: 2, fields: ["isbn, title", "copies: number"], methods: ["lend()", "restock()"] },
    { id: "loan", name: "Loan", col: 2, row: 2, fields: ["book: Book", "dueDay: number"], methods: ["feeAt(day)"] },
  ],
  relations: [
    { from: "library", to: "book", type: "composition", label: "owns" },
    { from: "library", to: "member", type: "aggregation", label: "knows" },
    { from: "member", to: "loan", type: "composition", label: "open" },
    { from: "loan", to: "book", type: "association" },
    { from: "library", to: "notifier", type: "dependency", label: "uses" },
  ],
  stages: [
    {
      title: "One class does everything",
      note: "The naive version: stock, members, loan rules, fees and email all live in Library. It works, and every new rule means editing the same class.",
      add: ["library"],
    },
    {
      title: "Nouns become classes",
      note: "Book and Member are things with their own data and rules. Library now owns its books and knows its members, and counting copies or checking a limit is the job of the class that holds the data.",
      add: ["book", "member"],
    },
    {
      title: "A relationship with data is a noun",
      note: "A member holding a book for 14 days has a due date and a fee, so it earns its own class. Loan sits in the member's list, refers to the Book, and computes its own fee.",
      add: ["loan"],
    },
    {
      title: "Collaborators are handed in",
      note: "Email does not belong to Library. A Notifier is passed in where it is needed, so Library depends on it for one call and a test can hand in a fake.",
      add: ["notifier"],
    },
  ],
};
