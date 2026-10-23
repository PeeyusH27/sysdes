Build the brain of an **ATM**. A customer inserts a card, types a PIN, and then checks a balance or withdraws cash. What a button does depends on where in that story the customer is, which is the State pattern, and the cash is paid out from limited stacks of notes, which is a job for a chain of handlers or a small loop that can backtrack. The tests drive one machine from the outside only, so design the classes however keeps these two ideas separate.

Implement the class `Atm`:

- `Atm(accounts, stock)`: `accounts` is a list of `[id, pin, balance]` (a card is identified by its account `id`; `pin` is a string; `balance` is whole dollars). `stock` is the notes in the machine as `[count100, count50, count20, count10]`. The machine starts in state `"IDLE"`, with no card.
- `insertCard(id)`: allowed only in `IDLE`. Returns `"OK"` and moves to `CARD_IN`; or `"UNKNOWN_CARD"` if no such account; or `"LOCKED"` if that account is locked. In the last two cases the machine stays `IDLE`. In any other state it returns `"INVALID_STATE"`.
- `enterPin(pin)`: allowed only in `CARD_IN`. A right PIN returns `"OK"`, moves to `AUTHENTICATED` and resets the account's failed-PIN count to 0. A wrong PIN returns `"WRONG_PIN"` and stays in `CARD_IN`, unless it is the account's **third wrong PIN in a row**: then the account becomes locked **for good**, the machine keeps the card, goes back to `IDLE`, and returns `"LOCKED"`. The failed-PIN count belongs to the account, so it survives `eject` and a new session. Any other state returns `"INVALID_STATE"`.
- `balance()`: allowed only in `AUTHENTICATED`. Returns the balance, or `-1` in any other state.
- `withdraw(amount)`: allowed only in `AUTHENTICATED`. On success returns the notes paid out as a list of `[note, count]` pairs, largest note first, leaving out notes with a count of 0, and stays `AUTHENTICATED`. On failure it returns one of the strings below and **changes nothing**. Checks run in this order and the first that fails decides the answer:
  1. `"INVALID_STATE"` if not `AUTHENTICATED`.
  2. `"INVALID_AMOUNT"` unless `amount` is a positive multiple of 10.
  3. `"NO_EXACT_NOTES"` if the notes in the machine cannot add up to exactly `amount`.
  4. `"INSUFFICIENT_FUNDS"` if the balance is lower than `amount`.
  5. `"JAM"` if the cash unit is jammed (see `jam`). The balance and the stock are left as they were.
- `eject()`: allowed in `CARD_IN` and `AUTHENTICATED`. Returns `"OK"` and goes to `IDLE`. In `IDLE` it returns `"INVALID_STATE"`.
- `state()`: returns `"IDLE"`, `"CARD_IN"` or `"AUTHENTICATED"`.
- `cash()`: the notes left in the machine as `[[100, c], [50, c], [20, c], [10, c]]`, always all four.
- `jam(flag)`: `true` makes the cash unit fail on every dispense until `jam(false)`. Returns `true`.

**Choosing the notes.** The note values are 100, 50, 20 and 10. When several combinations make the amount, use the one with the most 100s, then among those the most 50s, then the most 20s, then the 10s. Be careful: taking the biggest notes first can leave a remainder you cannot pay even though another combination works. With one 50 and three 20s, an amount of 60 must be paid as three 20s.

**Notes**

- Wrong or locked cards, wrong states and invalid amounts are ordinary return values. Nothing in this class throws.
- Locking is permanent for the length of the test: there is no way to unlock.
- A new machine knows nothing about earlier tests; each test builds its own.
