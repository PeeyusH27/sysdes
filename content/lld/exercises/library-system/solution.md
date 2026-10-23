This is two small ideas in one domain: a copy with a lifecycle, and a rule table with a swappable fine. The grade is on keeping each rule in exactly one place.

1. **Split the title from the copy.** A book owns its copies and one waiting queue. Search and the queue belong to the title, and state belongs to the copy. A single "book" record with a copies counter cannot say which copy is held for whom.
2. **Give a copy three states.** `AVAILABLE`, `LOANED`, `HELD`. A held copy remembers who it is for and a deadline. Every state change goes through two helpers, borrow (to `LOANED`) and release (to `HELD` or `AVAILABLE`), so there is no third place where a copy can change hands.
3. **Always release to the queue first.** A returned copy, and a copy whose hold lapsed, both call the same `release`: pop the queue; if someone is waiting, hold the copy for them until `day + 3`, otherwise make it available. That one rule is why a free copy only exists when nobody is waiting, so `borrow` can simply take "a copy held for me, else an available one".
4. **Put the tiers in a table.** `maxLoans`, `loanDays` and a `fine` function sit in one object per tier. Every method looks the tier up, and none contains a tier name. A third tier is a new row.
5. **Make a fine a function you can wrap.** `perDay(25)` turns days late into cents. `capped(inner, 1000)` wraps any policy without changing it. A grace period would be one more wrapper. Money stays in integer cents.
6. **Check in the order the statement gives.** Unknown first, then the limit, then no copy. Because the limit comes before the held copy, a member at their limit cannot pick up their hold, and the hold stays until they have room or it lapses.
7. **Keep `sweep` pure in time.** It receives the day, finds held copies whose deadline has passed, and releases each one through the same helper. No timers, no clock.

Where the design bends: the daily sweep and the queue are where events belong. A real system would publish "ready for pickup" and "overdue" to listeners (Observer) instead of making the caller poll `holds`. Two threads borrowing the last copy would need the check and the move to `LOANED` to be one atomic step, with a lock or a conditional database update.

Cost: this reference scans a book's copies and the loans, which is O(copies + loans) per call. Indexing open loans per member and copies by state makes each call O(1) expected, and a database does that with indexes.
