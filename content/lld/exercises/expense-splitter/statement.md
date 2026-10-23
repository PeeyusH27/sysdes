Build the money engine of a **Splitwise**-style app for one group of friends. Every expense is paid by one member and shared among some members, in one of four ways. Money is always **integer cents**, so shares must add up to the bill exactly. The four split types are the part that changes the most, so each should be its own rule that the rest of the code treats the same way: adding a fifth later must not mean editing the four that already work. That is the Strategy pattern, sitting on top of a small ledger of who owes whom.

Implement the class `Splitwise`:

- `Splitwise(members)`: a group with the given member names (strings).
- `addExpense(payer, amount, type, users, data)`: `payer` paid `amount` cents, shared among `users` (a list, in the order given). Returns `"OK"` and records it, or `"INVALID"` and changes nothing. The `type` decides how `data` (a list aligned with `users`) is used:
  - `"equal"`: everyone pays the same. `data` is ignored (it is `[]`).
  - `"exact"`: `data[i]` is the cents that `users[i]` pays. Each must be a whole number of at least 0, and they must add up to `amount`.
  - `"percent"`: `data[i]` is the whole percent that `users[i]` pays. Each must be a whole number of at least 1, and they must add up to 100.
  - `"shares"`: `data[i]` is a weight, a whole number of at least 1. People pay in proportion to their weights.
- `settle(from, to, amount)`: `from` pays `to` back `amount` cents of what they owe. Returns `"OK"`, or `"INVALID"` (and changes nothing) unless both are members, they are different, `amount` is a positive whole number, and `from` currently owes `to` **at least** `amount`.
- `owes(from, to)`: the cents `from` currently owes `to`. It is never negative, and at most one of `owes(a, b)` and `owes(b, a)` is above 0.
- `balance(user)`: net cents for `user`: what others owe them minus what they owe others. Positive means they are owed money. A name that is not a member gives `0`.
- `simplify()`: a short list of payments `[from, to, cents]` that would settle everyone, worked out from the **net balances** (see below).
- `expenseCount()`: how many expenses have been accepted so far.

**Valid expenses.** `addExpense` is `"INVALID"` unless: `payer` and every user are members; `users` is not empty and has no repeats; `amount` is a positive whole number; `type` is one of the four; and the `data` rules above hold. The payer does not have to be one of the users.

**Whole cents.** For `equal`, `percent` and `shares`, first give each person the **floor** of `amount * weight / total weight` (for `equal` every weight is 1). The cents left over, always fewer than the number of people, are then handed out **one each to the first people in `users`, in the order given**. For example, 1001 cents split equally among `[a, b, c]` is 334, 334, 333.

**Debts.** Each user owes the payer their share (the payer owes nothing for their own share). A debt in one direction cancels a debt in the other direction between the same two people, so for each pair only the difference is kept.

**Simplify.** Compute every member's net balance, then repeat until nobody owes anything: take the member who owes the **most** and the member who is owed the **most** (ties: the name that comes first alphabetically), and record one payment from the first to the second for the smaller of the two amounts. Return the payments in the order produced. Members whose balance is 0 never appear. (Finding the fewest possible payments is NP-hard in general; this greedy method needs at most one fewer payment than there are people.)

**Notes**

- Nothing throws; every failure is the string `"INVALID"`.
- `simplify` only reads the books. It does not change what anyone owes.
