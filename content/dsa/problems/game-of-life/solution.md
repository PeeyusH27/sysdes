### Intuition

The rule "all cells change at once" is the catch. If you overwrite a cell with its new state right away, the next cell counts a neighbour that is already in the new generation, and the result is wrong. Two clean ways out: copy the board and read from the copy (O(rows * columns) extra space), or **store the new state in the cell without losing the old one**.

For the in-place version use more than two values. Let `0` and `1` be dead and alive as usual, and add two transitional values: `2` = was alive, will be dead, and `3` = was dead, will be alive. While counting neighbours, treat both 1 and 2 as "was alive". After the whole scan, one more pass turns the board into plain 0s and 1s.

### Step by step

1. For each cell, count the neighbours that were alive: values 1 or 2.
2. If the cell is `1` and the count is less than 2 or more than 3, set it to `2`.
3. If the cell is `0` and the count is exactly 3, set it to `3`.
4. After every cell has been decided, loop again: values 1 and 3 become `1`, values 0 and 2 become `0`.

### Dry run: a vertical bar [[0, 1, 0], [0, 1, 0], [0, 1, 0]]

| cell | old | live neighbours | encoded as |
|---|---|---|---|
| (0, 1) | 1 | 1 | 2 (dies) |
| (1, 0) | 0 | 3 | 3 (born) |
| (1, 1) | 1 | 2 | 1 (stays) |
| (1, 2) | 0 | 3 | 3 (born) |
| (2, 1) | 1 | 1 | 2 (dies) |

After the second pass the middle row is 1 1 1 and the rest is 0: the bar has turned horizontal.

### Edge cases

- Cells on the border have fewer than eight neighbours; bounds-check each one.
- A 1 x 1 board: a live cell has no neighbours and dies.
- A 2 x 2 block of live cells: each has 3 neighbours, so it is stable.

### Common mistakes

- Counting neighbours with `board[nr][nc] === 1` only, so a cell marked `2` (still alive in the old generation) is missed.
- Counting the cell itself as one of its neighbours.
- Updating cells in one pass with no encoding, which mixes generations.

### Other ways to solve it

Copy the grid first and write results into the original while reading from the copy: simplest, O(rows * columns) extra space. On an infinite board, store only the live cells in a set and count neighbours for those cells and their neighbours.
