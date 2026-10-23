Build the brain of a **vending machine**. What a button press means depends on the phase the machine is in: selecting with no money is a different thing from selecting with money, and a machine that is out of service answers everything with a refusal. This is the State pattern: put each phase's behaviour in one place, so that an illegal event is a defined answer rather than a bug waiting behind a pile of flags.

Implement the class `VendingMachine`. The constructor takes `stock`, an object from slot code to `{ "price": cents, "qty": count }`, for example `{ "A1": { "price": 150, "qty": 2 } }`.

**Money** is integer cents. The accepted coins are `5`, `10`, `25` and `100`; anything else is not a coin.

**States**: `"IDLE"` (no credit, the start state), `"HAS_MONEY"` (credit above 0) and `"OUT_OF_SERVICE"`.

**Operations**

- `insert(cents)`: returns `"OK"` or `"REJECTED"`. A coin that is not accepted, or any coin while out of service, is `"REJECTED"` and the machine keeps nothing.
- `select(slot)`: returns one of `"DISPENSED"`, `"INSUFFICIENT"`, `"SOLD_OUT"`, `"INVALID_SLOT"`, `"NO_MONEY"` or `"OUT_OF_SERVICE"`. On `"DISPENSED"` the slot's quantity drops by 1, the price is taken from the credit, the rest of the credit is paid out as **change**, and the machine returns to `"IDLE"` with a balance of 0.
- `cancel()`: gives back all credit and returns the refunded cents (0 when there was none). The machine ends in `"IDLE"`, unless it is out of service, where it stays.
- `service(on)`: `service(true)` takes the machine out of service and `service(false)` puts it back into `"IDLE"`. Any credit is refunded first, and the call returns the refunded cents (0 when there was none, and always 0 for `service(false)`).
- `restock(slot, qty)`: adds `qty` items to an existing slot and returns the new quantity. It returns `-1`, changing nothing, for an unknown slot or a `qty` below 1.

**Queries** (they never change anything): `state()`, `balance()` (credit in cents), `change()` (the change paid out by the most recent `"DISPENSED"`, 0 before the first sale and unaffected by any other call) and `stock(slot)` (items left, or `-1` for an unknown slot).

**State by event table.** Every cell has exactly one outcome:

| Event | IDLE | HAS_MONEY | OUT_OF_SERVICE |
|---|---|---|---|
| `insert` (accepted coin) | add to credit, `"OK"`, go to HAS_MONEY | add to credit, `"OK"` | `"REJECTED"` |
| `insert` (any other value) | `"REJECTED"` | `"REJECTED"` | `"REJECTED"` |
| `select` | `"NO_MONEY"` (for any slot, valid or not) | see the order below | `"OUT_OF_SERVICE"` |
| `cancel` | returns 0 | refund the credit, go to IDLE | returns 0 |
| `service(true)` | returns 0, go to OUT_OF_SERVICE | refund the credit, go to OUT_OF_SERVICE | returns 0, stay |
| `service(false)` | returns 0, stay | returns 0, stay (credit kept) | returns 0, go to IDLE |
| `restock` | applies | applies | applies |

In HAS_MONEY, `select` checks in this order, and the first rule that applies wins:

1. The slot does not exist: `"INVALID_SLOT"`, state and credit unchanged.
2. The slot has no items left: `"SOLD_OUT"`, state and credit unchanged. This wins over `"INSUFFICIENT"`.
3. The credit is below the price: `"INSUFFICIENT"`, state and credit unchanged, so the customer can add more coins.
4. Otherwise `"DISPENSED"`, as described above.

**Notes**

- Money is never lost or created: for any sequence of calls, the cents inserted equal the prices paid plus the change and the refunds returned, plus the credit still held.
- `restock` changes only quantities, never the state, and works in every state.
- A sold-out slot is a fact about that slot, not about the machine: other slots still sell.
- There are no exceptions: every call returns one of the values above.
