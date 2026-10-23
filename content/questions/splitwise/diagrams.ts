import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "splitwise-classes",
  title: "Splitwise class diagram",
  description:
    "A Group owns its members, its expenses and a Ledger. When an expense arrives, the Group picks a SplitStrategy by type (equal, exact, percent or shares) to turn one amount into one share per person, then records each share in the Ledger as a debt to the payer. Listeners observe expenses and settlements.",
  classes: [
    { id: "equal", name: "EqualSplit", col: 2, row: 0, methods: ["split(amount, users)", "leftover cents: first users"] },
    { id: "exact", name: "ExactSplit", col: 3, row: 0, fields: ["data: cents per user"], methods: ["must sum to amount"] },

    { id: "listener", name: "GroupListener", col: 0, row: 1, stereotype: "interface", methods: ["onEvent(type, details)"] },
    {
      id: "group",
      name: "Group",
      col: 1,
      row: 1,
      fields: ["members: Set", "expenses: Expense[]", "lock: one per group"],
      methods: ["addExpense(payer, amount, type, users, data)", "settleUp(from, to, cents)", "on(listener)"],
    },
    { id: "strategy", name: "SplitStrategy", col: 2, row: 1, stereotype: "interface", methods: ["split(amount, users, data): shares?", "null if the data is invalid"] },
    { id: "percent", name: "PercentSplit", col: 3, row: 1, fields: ["data: whole percents"], methods: ["must sum to 100"] },

    { id: "expense", name: "Expense", col: 1, row: 2, fields: ["payer", "amount: cents", "type", "shares: cents per user"] },
    { id: "ledger", name: "Ledger", col: 2, row: 2, fields: ["owed: 'from>to' to cents"], methods: ["add(debtor, creditor, cents)", "settle(from, to, cents)", "balances()", "simplify()"] },
    { id: "shares", name: "SharesSplit", col: 3, row: 2, fields: ["data: weights"], methods: ["proportional, positive"] },
  ],
  relations: [
    { from: "group", to: "expense", type: "composition", label: "0..*" },
    { from: "group", to: "ledger", type: "composition" },
    { from: "group", to: "strategy", type: "association", label: "by type" },
    { from: "equal", to: "strategy", type: "implements" },
    { from: "exact", to: "strategy", type: "implements" },
    { from: "percent", to: "strategy", type: "implements" },
    { from: "shares", to: "strategy", type: "implements" },
    { from: "listener", to: "group", type: "dependency", label: "observes" },
  ],
  stages: [
    { title: "A group and its expenses", note: "A group knows who belongs to it and keeps a list of expenses. Each expense has one payer, an amount in cents, and a share for every participant.", add: ["group", "expense"] },
    { title: "A ledger of who owes whom", note: "Shares become debts from each participant to the payer. The ledger nets them per pair, so two opposite debts become one.", add: ["ledger"] },
    { title: "How to split is a strategy", note: "Equal and exact splits differ only in how they turn an amount into shares. The group picks one by name and does not branch on the type.", add: ["strategy", "equal", "exact"] },
    { title: "New splits are new classes", note: "Percent and share-weights arrive without touching the group or the ledger, and each owns its own validation.", add: ["percent", "shares"] },
    { title: "Observers", note: "Notifications and an activity feed listen to expenses and settlements. The group never depends on who is listening.", add: ["listener"] },
  ],
};

export const addFlow: SequenceSpec = {
  id: "splitwise-add-expense",
  title: "Ana pays 1001 for a dinner of three",
  description:
    "The group validates the participants, asks the split strategy for shares, and only then writes to the ledger. A bad expense is rejected before anything changes. After the lock is released, listeners are told.",
  actors: [
    { id: "ana", label: "Ana", kind: "client" },
    { id: "group", label: "Group", kind: "service" },
    { id: "split", label: "SplitStrategy", kind: "worker" },
    { id: "ledger", label: "Ledger", kind: "database" },
    { id: "listener", label: "Listener", kind: "pubsub" },
  ],
  items: [
    { from: "ana", to: "group", label: "addExpense(ana, 1001, equal, [ana, ben, cam])" },
    { note: "group lock taken; members checked", over: ["group", "split"] },
    {
      alt: [
        {
          when: "valid",
          items: [
            { from: "group", to: "split", label: "split(1001, users, [])" },
            { from: "split", to: "group", label: "[334, 334, 333]", type: "reply" },
            { from: "group", to: "ledger", label: "add(ben, ana, 334)" },
            { from: "group", to: "ledger", label: "add(cam, ana, 333)" },
            { note: "lock released", over: ["group", "ledger"] },
            { from: "group", to: "listener", label: "expense recorded", type: "async" },
            { from: "group", to: "ana", label: "ok, shares", type: "reply" },
          ],
        },
        {
          when: "bad split data",
          items: [
            { from: "group", to: "split", label: "split(1001, [ana, ben], [60, 30])" },
            { from: "split", to: "group", label: "null (percents add to 90)", type: "reply" },
            { from: "group", to: "ana", label: "rejected: invalid percent split", type: "reply" },
            { note: "the ledger was never touched", over: ["group", "ledger"] },
          ],
        },
        {
          when: "unknown person",
          items: [
            { note: "zed is not a member", over: ["group", "split"] },
            { from: "group", to: "ana", label: "rejected: invalid participants", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const settleFlow: SequenceSpec = {
  id: "splitwise-settle",
  title: "Settling up while someone else does too",
  description:
    "Settling checks the debt and subtracts from it in one locked step. Two people who both try to pay the same 100 cannot both succeed: the second finds the debt already gone. Pick a branch to see each outcome.",
  actors: [
    { id: "ben", label: "Ben", kind: "client" },
    { id: "group", label: "Group", kind: "service" },
    { id: "ledger", label: "Ledger", kind: "database" },
  ],
  items: [
    { note: "Ben owes Ana 100", over: ["ben", "group"] },
    { from: "ben", to: "group", label: "settleUp(ben, ana, 100)" },
    { note: "group lock taken", over: ["group", "ledger"] },
    { from: "group", to: "ledger", label: "settle(ben, ana, 100)" },
    {
      alt: [
        {
          when: "debt is there",
          items: [
            { from: "ledger", to: "group", label: "true, now 0", type: "reply" },
            { from: "group", to: "ben", label: "ok", type: "reply" },
          ],
        },
        {
          when: "pays too much",
          items: [
            { note: "asked for 150, owed 100", over: ["group", "ledger"] },
            { from: "ledger", to: "group", label: "false", type: "reply" },
            { from: "group", to: "ben", label: "rejected: nothing to settle", type: "reply" },
          ],
        },
        {
          when: "second racer",
          items: [
            { note: "another settleUp(ben, ana, 100) won the lock first", over: ["group", "ledger"] },
            { from: "ledger", to: "group", label: "false, debt is 0", type: "reply" },
            { from: "group", to: "ben", label: "rejected: nothing to settle", type: "reply" },
          ],
        },
      ],
    },
  ],
};
