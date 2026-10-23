### Intuition

Fix the **bottom edge** of the rectangle at some row. For each column, count how many consecutive 1s end exactly at that row going upward: call that `heights[j]`. A rectangle of 1s whose bottom is on this row is a set of adjacent columns whose heights are all at least some value, and its height is the smallest of them. That is precisely a rectangle under a bar chart.

So the problem becomes "largest rectangle in a histogram", solved once per row. The histogram problem has a classic O(columns) solution with a monotonic stack, so the whole grid costs O(rows * columns).

### Step by step

1. Keep `heights`, one number per column, all starting at 0.
2. For each row: for each column, `heights[j] = heights[j] + 1` if the cell is 1, otherwise `0`.
3. Compute the largest rectangle in `heights` and keep the best over all rows.
4. Largest rectangle in a histogram with a stack of indices whose bars increase:
   1. Walk `i` from 0 to `heights.length`, treating the bar at the end as height 0 so everything is flushed.
   2. While the top bar is at least as tall as the current one, pop it: its rectangle spans from just after the new stack top to `i - 1`, so the width is `i - left - 1`.
   3. Push `i`.

### Dry run: [[1, 0, 1], [1, 1, 1], [1, 1, 0]]

| row | heights | best rectangle in this histogram | best so far |
|---|---|---|---|
| 0 | 1 0 1 | 1 | 1 |
| 1 | 2 1 2 | 3 (height 1 across three columns) | 3 |
| 2 | 3 2 0 | 4 (height 2 across two columns) | 4 |

The answer is 4: the 2 x 2 block at the bottom-left.

### Why it works

Every all-ones rectangle has a bottom row. At that row, each of its columns has `heights[j]` at least the rectangle's height, so the histogram for that row contains it. Conversely any rectangle under the histogram is made of 1s. So the maximum over all rows is the answer.

### Common mistakes

- Resetting `heights[j]` to `0` only for the first row: a 0 in any row must reset that column's height.
- Reading the cell as a string `"1"` when the input holds the number `1`, or the other way round.
- Computing the width as `i - stack.top` instead of `i - left - 1` after popping.

### Other ways to solve it

A dynamic programming version keeps `left[j]`, `right[j]` and `height[j]` per column and updates them row by row, also O(rows * columns). Brute force over all rectangles is O(rows^2 * columns^2) with a prefix sum check.
