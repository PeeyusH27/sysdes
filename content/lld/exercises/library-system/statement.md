Build the core of a **library**: books with several copies, members with limits, a fair waiting queue, and fines. The rules differ by kind of member and the fine rule is likely to change, so the point of the exercise is to keep each rule in one place. A new kind of member must not mean an `if (tier === ...)` in five methods. Two ideas carry the design: a **copy has a small lifecycle** (available, loaned, held), and a **fine is a policy** you look up, not a branch.

Implement the class `Library`. Time is always a whole **day number** passed in; there is no clock.

- `addBook(isbn, title, copies)`: adds `copies` new copies (at least 1) of the book `isbn`. If the ISBN already exists, the new copies are added to it and its title is unchanged.
- `join(member, tier)`: registers a member. `tier` is `"standard"` or `"premium"`.
- `borrow(member, isbn, day)`: returns the new **loan id** (`"L1"`, `"L2"`, ... numbered in the order loans are made), or one of these strings, checked in this order: `"UNKNOWN"` (no such member or ISBN), `"LIMIT_REACHED"` (the member already has the maximum number of open loans), `"NO_COPY"` (no copy this member may take). A member may take a copy that is held for them, or any available copy. A copy held for someone else is not available to them.
- `returnBook(loanId, day)`: closes the loan and returns the **fine in cents**, or `-1` if the loan id is unknown or already closed. The returned copy goes to the first member in the book's waiting queue, if any (see `reserve`); otherwise it becomes available.
- `reserve(member, isbn)`: puts the member at the back of the book's waiting queue and returns their 1-based place (`1` means next in line). It returns `0` and changes nothing if: the member or ISBN is unknown, **any copy is available** (just borrow it), the member is already in the queue, or a copy is already held for the member.
- `renew(loanId, day)`: extends the loan and returns the **new due day**, or `-1` if it is refused. It is refused when the loan is unknown or closed, when `day` is after the due day, when the loan has already been renewed twice, or when **anyone is waiting** in that book's queue. A renewal adds the member's loan period to the current due day.
- `sweep(day)`: call once a day. Every held copy whose hold has **lapsed** (`day` is later than its hold deadline) is passed on: to the next member in the queue, or back to available if nobody waits. Returns how many holds lapsed in this call. A member whose hold lapsed loses their place and is not put back in the queue.
- `available(isbn)`: the number of copies that are available right now, or `-1` for an unknown ISBN.
- `queue(isbn)`: the member ids waiting, in order (`[]` if none or unknown).
- `holds(isbn)`: the member ids a copy is currently held for, sorted alphabetically.
- `search(text)`: the ISBNs of books whose title contains `text`, ignoring case, sorted alphabetically.

**The rules by tier**

| Tier | Max open loans | Loan period | Fine per day late | Fine cap |
|---|---|---|---|---|
| `standard` | 3 | 14 days | 25 cents | 1000 cents |
| `premium` | 5 | 21 days | 10 cents | 500 cents |

A loan made on `day` is due on `day + loan period`. The days late are `returnDay - due`; the fine is `min(cap, max(0, daysLate) * rate)`. A book returned on its due day is not late.

**Holds.** When a returned copy goes to a waiting member it is **held** for them, with a deadline of the return day plus 3, inclusive: a hold made on day 2 can be collected through day 5 and lapses on `sweep(6)`. Holding a copy removes that member from the queue.

**Notes**

- A held copy is neither available nor loaned. It becomes loaned when the member it is held for borrows it, and the limit check still applies first: a member at their limit gets `"LIMIT_REACHED"` and the hold stays.
- Rejected calls change nothing.
- The queue is per book, not per copy.
- Return values must be exactly the types above: a string, a number, or an array.
