### Intuition

The tempting loop, "for every amount, try every coin as the last coin", is the one from Coin Change, and here it gives the wrong number: it counts `1 + 2` and `2 + 1` separately. For amount 4 with coins `[1, 2]` it finds 5 orderings instead of 3 combinations.

To count each combination once, decide the coins **one value at a time**: first how many 1s, then how many 2s, and so on. That is a 2D DP over "the first `i` coin values" × "the amount", where the last decision for a cell is about the newest coin value:

- use **no** coin of this value → the count for the same amount with the earlier values,
- use **at least one** → one fewer of this coin, so the same row at `amount - coin` (the coin may still be used again).

Because each row reads only itself and the row above, it compresses to a single array where the **coin loop is outside** and the amount loop goes **up**.

### Step by step

1. **State** (2D form): `ways[i][a]` = the number of combinations of the first `i` coin values that make exactly `a`.
2. **Recurrence**: `ways[i][a] = ways[i - 1][a] + ways[i][a - c]` (no coin of value `c`, or at least one), where `c` is the `i`-th coin and the second term only applies when `c <= a`.
3. **Base cases**: `ways[i][0] = 1` (make 0 with no coins); `ways[0][a] = 0` for `a > 0` (no coins can't make a positive amount).
4. **Order and space**: one array `ways` of length `amount + 1` with `ways[0] = 1`:
   1. For each `coin` (outer loop):
   2. For `a` from `coin` up to `amount` (inner loop, going **up**): `ways[a] += ways[a - coin]`.
   - Before the update, `ways[a]` still holds the "without this coin" count (the row above); `ways[a - coin]` has already been updated for this coin (the same row), which is what allows several copies.
5. **Answer**: `ways[amount]`.

### Dry run: `amount = 6`, `coins = [1, 2, 3]`

| after coin | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| (none) | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| 2 | 1 | 1 | 2 | 2 | 3 | 3 | 4 |
| 3 | 1 | 1 | 2 | 3 | 4 | 5 | **7** |

For example, after coin 3, `ways[6] = 4 + ways[3] = 4 + 3 = 7`: the 4 combinations of 1s and 2s that make 6, plus the 3 combinations that make 3 (with 1s, 2s or 3s) followed by one more 3.

### Why it works

Every combination is a count of 1s, a count of 2s, and so on. Processing coin values in a fixed order means each combination is built along exactly one path: all its 1s while handling coin 1, all its 2s while handling coin 2, and so on. No combination is reached twice, and none is missed, so the final count is exact.

### Edge cases

- `amount = 0`: the answer is 1 (the empty combination), even if no coin is that small.
- Amounts that can't be made stay at 0 (coins of 2 can't make 3).
- Large inputs: the answers can reach millions, but the table has only `amount + 1` cells per coin, so it stays fast where enumerating combinations would not.

### Common mistakes

- Amount loop outside, coin loop inside: that counts ordered sequences (`[1, 2]` with amount 4 gives 5, not 3).
- Looping amounts **down** with one row: each coin can then be used at most once (that is the 0/1 version).
- `ways[0] = 0`: nothing can ever be counted.
- Recursion that tries every coin at every step without a fixed order: it counts permutations, and without a memo it is exponential.
