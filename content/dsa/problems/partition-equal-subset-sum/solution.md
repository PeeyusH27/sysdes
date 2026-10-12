### Intuition

If the two groups have equal sums, each one sums to exactly **half the total**. So:

1. An odd total can never be split: return `false` at once.
2. Otherwise the question is "does **some subset** add up to `total / 2`?" The other group is everything else, and it automatically sums to the other half.

Checking all 2^n subsets is too slow for 40 numbers. But the only thing that matters about a subset is its **sum**, and sums can't exceed `total / 2`. So track which sums are reachable, adding the numbers one at a time. Each number is either left out or used **once**: that is the 0/1 knapsack, with "reachable or not" instead of a value.

### Step by step

1. Compute `total`. If it is odd, return `false`. Let `target = total / 2`.
2. **State** (2D form): `reachable[i][s]` = `true` if some subset of the first `i` numbers sums to exactly `s`.
3. **Recurrence**: `reachable[i][s] = reachable[i - 1][s] || reachable[i - 1][s - x]`, where `x` is the `i`-th number: leave `x` out, or put it in.
4. **Base case**: `reachable[0][0] = true` (the empty subset sums to 0); every other sum starts `false`.
5. **Order and space**: each row reads only the row above, so keep **one row** and, for each number `x`, loop `s` from `target` **down** to `x`:
   - going down, `reachable[s - x]` hasn't been updated for `x` yet, so it still means "without `x`", and no number is used twice;
   - going up would let `x` be added again and again (that would be the unbounded knapsack).
6. **Answer**: `reachable[target]`. You can also stop early as soon as it becomes `true`.

### Dry run: `[3, 1, 4, 2, 2]`, total 12, target 6

Each row is the one-row table after adding a number (✓ = that sum is reachable).

| after adding | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| (nothing) | ✓ | · | · | · | · | · | · |
| 3 | ✓ | · | · | ✓ | · | · | · |
| 1 | ✓ | ✓ | · | ✓ | ✓ | · | · |
| 4 | ✓ | ✓ | · | ✓ | ✓ | ✓ | · |
| 2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| 2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Sum 6 becomes reachable when the first 2 is added: `reachable[4]` was already true (from `4` alone), and `4 + 2 = 6`. So `[4, 2]` and `[3, 1, 2]` is a valid split.

### Why it works

After processing some numbers, the row marks exactly the sums of their subsets: every such subset either skips the newest number (its sum was already marked) or uses it once (its sum is an older mark plus `x`). Looping downward guarantees "older mark" really means a subset **without** `x`. So `reachable[target]` is true exactly when some subset reaches half the total.

### Edge cases

- Odd total: false immediately, with no table.
- A single number `x`: the only split is `x` against nothing, which is never equal. The odd check or the table (only sums 0 and `x` are reachable, never `x / 2`) returns false.
- Every number even but half the total odd, as in the test with many 2s and one 6: no subset can reach an odd sum. The table finds that in O(n × S) where backtracking would try exponentially many subsets.

### Common mistakes

- Looping `s` upward with one row: a number gets used several times, so `[1, 2, 5]` would wrongly reach 4 as `2 + 2`.
- Forgetting `reachable[0] = true`, so nothing ever becomes reachable.
- Skipping the odd-total check and then using a fractional `target` as an array size.
- Backtracking over subsets without a memo: fine on small inputs, too slow on the 39- and 40-element tests.
