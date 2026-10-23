### Intuition

Because each row starts above where the previous row ended, reading the grid row by row gives **one sorted list** of `m * n` values. Binary search works on any sorted list, and you do not have to build that list: you only need to turn a position in it into a cell.

Position `p` in the imaginary list sits in row `Math.floor(p / n)` and column `p % n`. That is the same arithmetic as turning a seconds count into minutes and seconds.

### Step by step

1. Set `lo = 0` and `hi = m * n - 1`.
2. While `lo <= hi`:
   1. `mid = Math.floor((lo + hi) / 2)`.
   2. `value = matrix[Math.floor(mid / n)][mid % n]`.
   3. If `value` equals `target`, return `true`.
   4. If `value` is smaller, search the right half: `lo = mid + 1`. Otherwise search the left half: `hi = mid - 1`.
3. Return `false`.

### Dry run: target 11 in [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]]

| lo | hi | mid | cell | value | action |
|---|---|---|---|---|---|
| 0 | 11 | 5 | row 1, col 1 | 11 | found |

With target 13: mid 5 gives 11 (too small, lo = 6); mid 8 gives 23 (too big, hi = 7); mid 6 gives 16 (hi = 5); then lo > hi, so the answer is false.

### Why it works

The two properties together mean the position order and the value order agree, so comparing against the middle always discards the half that cannot contain the target. That is the entire correctness argument for binary search.

### Common mistakes

- Using `mid / m` or swapping rows and columns in the conversion. The divisor is the number of **columns**.
- Forgetting `Math.floor` on the row, which indexes with a fraction.
- Searching one row at a time after a binary search for the row, but with the wrong boundary: the single combined search avoids this.

### Other ways to solve it

Binary search for the right row (the last whose first value is at most the target), then binary search inside it: the same O(log m + log n). If the grid were only row-sorted and column-sorted (no "row starts above previous end" rule), you would instead start at the top-right corner and walk left or down in O(m + n).
