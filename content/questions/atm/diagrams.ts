import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "atm-classes",
  title: "ATM class diagram",
  description:
    "Atm holds the current card and the note stock and points at its current state. Each state (Idle, CardIn, Authenticated) lists the events it accepts. Withdrawals ask a chain of NoteHandlers for a note plan, debit the Account, then tell the injected CashUnit to dispense. Listeners observe every event.",
  classes: [
    { id: "idle", name: "Idle", col: 2, row: 0, methods: ["insertCard(id): CardIn"] },
    { id: "cardIn", name: "CardIn", col: 3, row: 0, methods: ["enterPin(pin)", "eject(): Idle"] },

    { id: "listener", name: "AtmListener", col: 0, row: 1, stereotype: "interface", methods: ["onEvent(type, ok)"] },
    {
      id: "atm",
      name: "Atm",
      col: 1,
      row: 1,
      fields: ["state: StateName", "card: Account?", "stock: { note: count }"],
      methods: ["insertCard(id)", "enterPin(pin)", "withdraw(amount)", "balance()", "eject()"],
    },
    { id: "state", name: "AtmState", col: 2, row: 1, stereotype: "interface", methods: ["[event](atm, args): next", "missing event: rejected"] },
    { id: "authed", name: "Authenticated", col: 3, row: 1, methods: ["withdraw(amount)", "balance()", "eject(): Idle"] },

    { id: "account", name: "Account", col: 1, row: 2, fields: ["pin, balance: int", "failedPins, locked"], methods: ["tryPin(pin)", "debit(amount): bool", "credit(amount)"] },
    { id: "chain", name: "NoteHandler", col: 2, row: 2, fields: ["denom: 100, 50, 20, 10", "next: NoteHandler?"], methods: ["plan(amount, stock): notes?"] },
    { id: "cash", name: "CashUnit", col: 3, row: 2, stereotype: "interface", methods: ["dispense(notes): bool"] },
  ],
  relations: [
    { from: "atm", to: "account", type: "association", label: "card" },
    { from: "atm", to: "state", type: "association", label: "current" },
    { from: "idle", to: "state", type: "implements" },
    { from: "cardIn", to: "state", type: "implements" },
    { from: "authed", to: "state", type: "implements" },
    { from: "atm", to: "chain", type: "composition", label: "chain" },
    { from: "authed", to: "chain", type: "dependency", label: "plan()" },
    { from: "atm", to: "cash", type: "dependency", label: "dispense" },
    { from: "listener", to: "atm", type: "dependency", label: "observes" },
  ],
  stages: [
    { title: "The machine and the account", note: "An ATM works on one card at a time, and the card points at an account that owns the balance and the PIN counter.", add: ["atm", "account"] },
    { title: "Behaviour depends on the step", note: "What a button does depends on whether a card is in, and whether the PIN passed. Each state lists the events it accepts, and anything else is rejected.", add: ["state", "idle", "cardIn", "authed"] },
    { title: "Cash is a chain", note: "One handler per note value takes what it can and passes the rest on, so a new note value is one more link and no edit to the others.", add: ["chain"] },
    { title: "The hardware is injected", note: "The ATM asks a CashUnit to dispense. A fake unit lets a test make the cash jam and check that the debit is undone.", add: ["cash"] },
    { title: "Observers", note: "An audit log, receipts and alerts listen to the events. The ATM never knows who is listening.", add: ["listener"] },
  ],
};

export const withdrawFlow: SequenceSpec = {
  id: "atm-withdraw",
  title: "Withdraw 130 from an authenticated session",
  description:
    "The ATM first asks the chain for a note plan, because planning changes nothing. Only with a plan does it debit the account in one locked step, and only then does it ask the cash unit to dispense. If the cash jams, the debit is reversed. Pick a branch to see each outcome.",
  actors: [
    { id: "customer", label: "Customer", kind: "client" },
    { id: "atm", label: "Atm", kind: "service" },
    { id: "chain", label: "Note chain", kind: "worker" },
    { id: "account", label: "Account", kind: "database" },
    { id: "cash", label: "Cash unit", kind: "external" },
  ],
  items: [
    { note: "state AUTHENTICATED, balance 500", over: ["customer", "atm"] },
    { from: "customer", to: "atm", label: "withdraw(130)" },
    { from: "atm", to: "chain", label: "plan(130, stock)" },
    {
      alt: [
        {
          when: "dispensed",
          items: [
            { from: "chain", to: "atm", label: "100 x1, 20 x1, 10 x1", type: "reply" },
            { from: "atm", to: "account", label: "debit(130)" },
            { from: "account", to: "atm", label: "true, balance 370", type: "reply" },
            { from: "atm", to: "cash", label: "dispense(notes)" },
            { from: "cash", to: "atm", label: "ok", type: "reply" },
            { from: "atm", to: "customer", label: "3 notes, balance 370", type: "reply" },
            { note: "stock reduced, still AUTHENTICATED", over: ["atm", "chain"] },
          ],
        },
        {
          when: "no exact notes",
          items: [
            { from: "chain", to: "atm", label: "none (notes run out)", type: "reply" },
            { from: "atm", to: "customer", label: "rejected: cannot dispense that amount", type: "reply" },
            { note: "nothing was debited", over: ["atm", "account"] },
          ],
        },
        {
          when: "insufficient funds",
          items: [
            { from: "chain", to: "atm", label: "100 x1, 20 x1, 10 x1", type: "reply" },
            { from: "atm", to: "account", label: "debit(130)" },
            { from: "account", to: "atm", label: "false (balance 40)", type: "reply" },
            { from: "atm", to: "customer", label: "rejected: insufficient funds", type: "reply" },
          ],
        },
        {
          when: "cash jams",
          items: [
            { from: "chain", to: "atm", label: "100 x1, 20 x1, 10 x1", type: "reply" },
            { from: "atm", to: "account", label: "debit(130)" },
            { from: "account", to: "atm", label: "true", type: "reply" },
            { from: "atm", to: "cash", label: "dispense(notes)" },
            { from: "cash", to: "atm", label: "jam", type: "reply" },
            { from: "atm", to: "account", label: "credit(130): undo" },
            { from: "atm", to: "customer", label: "rejected: nothing charged", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const pinFlow: SequenceSpec = {
  id: "atm-pin",
  title: "Entering a PIN",
  description:
    "The failed-attempt counter lives on the account, not on the machine, so trying three PINs on each of ten machines does not work. The third wrong PIN locks the account and the machine keeps the card.",
  actors: [
    { id: "customer", label: "Customer", kind: "client" },
    { id: "atm", label: "Atm", kind: "service" },
    { id: "account", label: "Account", kind: "database" },
  ],
  items: [
    { note: "state CARD_IN", over: ["customer", "atm"] },
    { from: "customer", to: "atm", label: "enterPin('1234')" },
    { from: "atm", to: "account", label: "tryPin('1234')" },
    {
      alt: [
        {
          when: "right PIN",
          items: [
            { from: "account", to: "atm", label: "ok, counter reset to 0", type: "reply" },
            { from: "atm", to: "customer", label: "authenticated", type: "reply" },
            { note: "CARD_IN → AUTHENTICATED", over: ["customer", "atm"] },
          ],
        },
        {
          when: "wrong PIN",
          items: [
            { from: "account", to: "atm", label: "wrong, 2 tries left", type: "reply" },
            { from: "atm", to: "customer", label: "try again", type: "reply" },
            { note: "stays CARD_IN", over: ["customer", "atm"] },
          ],
        },
        {
          when: "third wrong PIN",
          items: [
            { from: "account", to: "atm", label: "locked", type: "reply" },
            { from: "atm", to: "customer", label: "card retained", type: "reply" },
            { note: "CARD_IN → IDLE, account locked on every machine", over: ["atm", "account"] },
          ],
        },
      ],
    },
  ],
};
