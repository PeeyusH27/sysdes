You are given an `n × n` grid of `0`s and `1`s. A `0` is an open cell and a `1` is a blocked cell.

Find the shortest **clear path** from the top-left cell `(0, 0)` to the bottom-right cell `(n - 1, n - 1)`. A clear path visits only open cells, and from any cell you may step to any of its **8 neighbours**: up, down, left, right, or one of the four diagonals.

The length of a path is the **number of cells it visits**, counting both the first and the last. Return that length, or `-1` if no clear path exists.

### Constraints

- `1 <= n <= 100`
- `grid[i][j]` is `0` or `1`
