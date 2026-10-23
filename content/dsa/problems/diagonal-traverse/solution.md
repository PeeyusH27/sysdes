### Intuition

Along an anti-diagonal the row goes up by 1 as the column goes down by 1, so `row + column` never changes. That sum labels each diagonal: the corner has sum 0, and the last diagonal has sum `m + n - 2`. Walking the diagonals in order of that sum visits every cell exactly once.

The only extra rule is the direction. Reading a diagonal with the row increasing goes down-left. The zig-zag says odd sums go down-left and even sums go up-right, so reverse every even diagonal.

### Step by step

1. For each `sum` from 0 to `m + n - 2`:
   1. Find the rows that lie on the diagonal: `r` runs from `max(0, sum - (n - 1))` to `min(m - 1, sum)`, because the column `sum - r` has to stay between 0 and `n - 1`.
   2. Collect `matrix[r][sum - r]` for those rows, with `r` increasing.
2. If `sum` is even, reverse the collected diagonal.
3. Append it to the answer.

### Dry run: [[1, 2, 3], [4, 5, 6]]

| sum | rows | collected | even? | appended |
|---|---|---|---|---|
| 0 | 0..0 | 1 | yes | 1 |
| 1 | 0..1 | 2, 4 | no | 2, 4 |
| 2 | 0..1 | 3, 5 | yes (reverse) | 5, 3 |
| 3 | 1..1 | 6 | no | 6 |

The answer is 1 2 4 5 3 6.

### Edge cases

- A single row or column: every diagonal holds one cell, so direction does not matter.
- Non-square grids: the row range formula clips the first and last diagonals correctly.

### Common mistakes

- Reversing the odd diagonals instead of the even ones, which gives the mirror-image path.
- Using `0..sum` for the rows without clipping to the grid, so you read outside it.
- Simulating with a step direction and getting the corner turns wrong. The "group by sum" version has no corner cases.

### Other ways to solve it

Simulate the walk: move by (-1, +1) or (+1, -1), and when you step out of the grid, move to the next diagonal's start (right or down depending on which edge you hit) and flip the direction. It uses O(1) extra space but has four boundary cases to get right.
