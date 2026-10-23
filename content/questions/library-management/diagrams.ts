import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "library-classes",
  title: "Library management class diagram",
  description:
    "A Book is a title and owns its copies (BookItem) and its waiting queue. A copy moves through ItemState. Library is the entry point: it creates Loans, asks a FinePolicy chosen by member type for the fine, and publishes events to listeners.",
  classes: [
    { id: "member", name: "Member", col: 0, row: 0, fields: ["id", "type: STANDARD | PREMIUM"], methods: ["maxLoans, loanDays: from type"] },
    { id: "loan", name: "Loan", col: 1, row: 0, fields: ["id, memberId, itemId", "due: day", "renewals: 0..2", "open: boolean"] },
    { id: "listener", name: "LibraryListener", col: 2, row: 0, stereotype: "interface", methods: ["on(event)"] },
    { id: "policy", name: "FinePolicy", col: 3, row: 0, stereotype: "interface", methods: ["fine(daysLate): cents"] },

    { id: "book", name: "Book", col: 0, row: 1, fields: ["isbn, title, author", "queue: memberId[]"], methods: ["search by title or author"] },
    {
      id: "library",
      name: "Library",
      col: 1,
      row: 1,
      fields: ["books: Map<isbn, Book>", "loans, members", "fines: Map<type, FinePolicy>"],
      methods: ["borrow(member, isbn, day)", "returnItem(loan, day)", "reserve(member, isbn)", "renew(loan, day)", "sweep(day)"],
    },
    { id: "item", name: "BookItem", col: 2, row: 1, fields: ["id", "state", "heldFor, holdUntil"], methods: ["moveTo(state)"] },
    { id: "perday", name: "PerDayFine", col: 3, row: 1, fields: ["centsPerDay"], methods: ["fine(daysLate)"] },

    { id: "itemstate", name: "ItemState", col: 2, row: 2, fields: ["AVAILABLE", "LOANED", "HELD", "LOST"], methods: ["canGoTo(next)"] },
    { id: "capped", name: "CappedFine", col: 3, row: 2, fields: ["inner: FinePolicy", "capCents"], methods: ["fine(daysLate): min(cap, inner)"] },
  ],
  relations: [
    { from: "library", to: "book", type: "composition", label: "by isbn" },
    { from: "book", to: "item", type: "composition", label: "1..*" },
    { from: "library", to: "member", type: "association" },
    { from: "library", to: "loan", type: "composition" },
    { from: "loan", to: "item", type: "association", label: "one copy" },
    { from: "item", to: "itemstate", type: "association" },
    { from: "library", to: "policy", type: "association", label: "per member type" },
    { from: "perday", to: "policy", type: "implements" },
    { from: "capped", to: "policy", type: "implements" },
    { from: "capped", to: "perday", type: "aggregation", label: "wraps one" },
    { from: "listener", to: "library", type: "dependency", label: "observes" },
  ],
  stages: [
    { title: "A title and its copies are different things", note: "A Book is the title, with an ISBN. Each physical copy is a BookItem. Searching is about books, borrowing is about one copy.", add: ["book", "item"] },
    { title: "People, loans, and one entry point", note: "A Library creates Loans between a Member and one copy. The member type carries the limits, so a premium member is data and not a subclass.", add: ["member", "loan", "library"] },
    { title: "A copy has a lifecycle", note: "A copy is available, loaned, held for the next person in the queue, or lost. The allowed moves live in one place, so an illegal move fails loudly instead of corrupting a count.", add: ["itemstate"] },
    { title: "Fines are a policy", note: "A FinePolicy turns days late into cents. A cap or a grace period wraps another policy, and each member type gets its own.", add: ["policy", "perday", "capped"] },
    { title: "Observers hear the events", note: "Borrowed, returned, ready for pickup and overdue go out to listeners such as email. The library never depends on who listens.", add: ["listener"] },
  ],
};

export const borrowFlow: SequenceSpec = {
  id: "library-borrow",
  title: "Borrow a book",
  description:
    "The library checks the member's limit, looks for a copy held for this member and then for a free one, moves the copy to LOANED in one step, and creates the loan. If every copy is out, the member is told so and can join the queue.",
  actors: [
    { id: "member", label: "Member", kind: "client" },
    { id: "lib", label: "Library", kind: "service" },
    { id: "book", label: "Book", kind: "database" },
    { id: "item", label: "BookItem", kind: "worker" },
    { id: "notify", label: "Listeners", kind: "pubsub" },
  ],
  items: [
    { from: "member", to: "lib", label: "borrow(ann, 222, day 10)" },
    { note: "lock taken: one change at a time", over: ["lib", "book"] },
    {
      alt: [
        {
          when: "copy available",
          items: [
            { from: "lib", to: "book", label: "held for ann, else any AVAILABLE copy" },
            { from: "book", to: "lib", label: "copy 222#2", type: "reply" },
            { from: "lib", to: "item", label: "moveTo(LOANED)" },
            { note: "loan due day 24 (14 days, standard member)", over: ["lib", "item"] },
            { from: "lib", to: "member", label: "loan L1", type: "reply" },
            { from: "lib", to: "notify", label: "borrowed", type: "async" },
          ],
        },
        {
          when: "limit reached",
          items: [
            { note: "ann already has 3 open loans", over: ["lib", "book"] },
            { from: "lib", to: "member", label: "LIMIT_REACHED", type: "reply" },
          ],
        },
        {
          when: "every copy is out",
          items: [
            { from: "lib", to: "book", label: "any AVAILABLE or held copy?" },
            { from: "book", to: "lib", label: "none", type: "reply" },
            { from: "lib", to: "member", label: "NO_COPY: reserve to join the queue", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const returnFlow: SequenceSpec = {
  id: "library-return",
  title: "Return a book",
  description:
    "The library closes the loan and prices any lateness with the member's fine policy. Then the copy goes to the first member waiting, who is notified, or becomes available if nobody waits.",
  actors: [
    { id: "member", label: "Member", kind: "client" },
    { id: "lib", label: "Library", kind: "service" },
    { id: "fine", label: "FinePolicy", kind: "worker" },
    { id: "item", label: "BookItem", kind: "database" },
    { id: "notify", label: "Listeners", kind: "pubsub" },
  ],
  items: [
    { from: "member", to: "lib", label: "returnItem(L1, day 18)" },
    { from: "lib", to: "fine", label: "fine(18 - 14 = 4 days late)" },
    { from: "fine", to: "lib", label: "100 cents (4 x 25)", type: "reply" },
    {
      alt: [
        {
          when: "nobody waiting",
          items: [
            { from: "lib", to: "item", label: "moveTo(AVAILABLE)" },
            { from: "lib", to: "member", label: "fine 100", type: "reply" },
          ],
        },
        {
          when: "someone waiting",
          items: [
            { note: "queue is bob, cy: bob leaves the queue", over: ["lib", "item"] },
            { from: "lib", to: "item", label: "moveTo(HELD), held for bob until day 21" },
            { from: "lib", to: "notify", label: "ready: bob", type: "async" },
            { from: "lib", to: "member", label: "fine 100", type: "reply" },
          ],
        },
      ],
    },
  ],
};
