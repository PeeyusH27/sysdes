### Intuition

A spiral is a sequence of laps around a shrinking rectangle. Describe the rectangle with four boundaries, `top`, `bottom`, `left` and `right`. Walk its border clockwise, and when a side has been read, move that boundary one step inward. When the boundaries cross, there is nothing left.

This is simpler than tracking direction and a visited grid, and it uses no extra memory apart from the output.

### Step by step

1. Set `top = 0`, `bottom = m-1`, `left = 0`, `right = n-1`.
2. While `top <= bottom` and `left <= right`:
   1. Read the top row from `left` to `right`, then `top++`.
   2. Read the right column from `top` to `bottom`, then `right--`.
   3. If `top <= bottom`, read the bottom row from `right` down to `left`, then `bottom--`.
   4. If `left <= right`, read the left column from `bottom` up to `top`, then `left++`.
3. Return the collected values.

### Dry run: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

| lap | side | values read | boundaries after |
|---|---|---|---|
| 1 | top | 1 2 3 | top = 1 |
| 1 | right | 6 9 | right = 1 |
| 1 | bottom | 8 7 | bottom = 1 |
| 1 | left | 4 | left = 1 |
| 2 | top | 5 | top = 2 |
| 2 | right | (none, top > bottom) | right = 0 |

The loop ends because `top > bottom`. The result is 1 2 3 6 9 8 7 4 5.

### Edge cases

- One row: the top edge reads everything, then `top > bottom` so the bottom edge is skipped.
- One column: the right edge reads everything below the first cell, then `left > right` skips the left edge.
- Odd-by-odd grids end on a single centre cell.

### Common mistakes

- Dropping the two `if` guards, so a leftover single row or column is read twice (once in each direction).
- Updating a boundary before the loop that uses it, which shifts the range by one.
- Using `>=` where `<=` is needed in the loop condition and losing the last row or column.
