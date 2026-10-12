### Intuition

The natural first idea, "use the biggest coin that fits, repeat", is wrong. With coins `[1, 3, 4]` and amount 6 it picks `4 + 1 + 1` (three coins), but `3 + 3` uses two. With `[25, 10]` and amount 30 it is worse: after 25 the remaining 5 can't be made at all, although `10 + 10 + 10` works.

So consider **every** possible last coin. If the last coin is `c`, the coins before it make the amount `a - c`, and they should be the fewest possible for that smaller amount. That gives a DP over amounts: solve every amount from 0 up to the target, each one from smaller amounts that are already solved.

### Step by step

1. **State**: `fewest[a]` = the fewest coins whose values add up to exactly `a`, or `Infinity` if `a` can't be made.
2. **Recurrence**: `fewest[a] = 1 + min(fewest[a - c])` over every coin `c <= a`.
3. **Base case**: `fewest[0] = 0`. Every other cell starts at `Infinity`, which `Math.min` ignores and which stays `Infinity` when `1` is added to it.
4. **Order**: `a` from 1 up to `amount`; every `a - c` is smaller, so it is already final.
5. **Answer**: `fewest[amount]`, converted to `-1` if it is still `Infinity`.
6. **Space**: the cell reads arbitrary smaller amounts, so keep the whole array (O(amount)).

### Dry run: `coins = [1, 3, 4]`, `amount = 6`

| a | last coin 1: fewest[a - 1] + 1 | last coin 3: fewest[a - 3] + 1 | last coin 4: fewest[a - 4] + 1 | fewest[a] |
|---|---|---|---|---|
| 0 | | | | 0 (base) |
| 1 | 0 + 1 = 1 | doesn't fit | doesn't fit | 1 |
| 2 | 1 + 1 = 2 | doesn't fit | doesn't fit | 2 |
| 3 | 2 + 1 = 3 | 0 + 1 = 1 | doesn't fit | 1 |
| 4 | 1 + 1 = 2 | 1 + 1 = 2 | 0 + 1 = 1 | 1 |
| 5 | 1 + 1 = 2 | 2 + 1 = 3 | 1 + 1 = 2 | 2 |
| 6 | 2 + 1 = 3 | 1 + 1 = **2** | 2 + 1 = 3 | **2** |

### Why it works

Any optimal set of coins for `a` has some last coin `c`, and the remaining coins make `a - c`. If they were not the fewest possible for `a - c`, swapping in a better set would improve the answer for `a`, a contradiction. So the best for `a` is always "one coin plus the best for `a - c`" for some coin `c`, and the recurrence tries them all.

### Edge cases

- `amount = 0`: the answer is `0` without looking at the coins.
- Impossible amounts stay at `Infinity` all the way through: return `-1`, not `Infinity`.
- Coins bigger than the amount are simply never used (`coin <= a` guards the index).
- Large amounts (10^4) with plain recursion explode; the table does `amount × coins.length` steps.

### Common mistakes

- Greedy by largest coin: fails `[1, 3, 4]` with 6 and `[25, 10]` with 30.
- Filling with `0` or `-1` instead of `Infinity`: then `Math.min` happily picks an "impossible" amount as the cheapest.
- Returning `fewest[amount]` without converting `Infinity` to `-1`.
- Initialising `fewest` with `amount + 1` slots but looping `a < amount`, which never fills the answer cell.

### Other ways to solve it

**Breadth-first search over amounts** (O(amount × coins) time and space): start from 0, and each BFS level adds one coin. The first level that reaches `amount` is the fewest coins. It does the same work as the table in the worst case, but can stop early when the answer is small.
