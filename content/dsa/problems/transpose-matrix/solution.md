### Intuition

Look at where one value goes. The cell at row `i`, column `j` moves to row `j`, column `i`: its two coordinates simply swap. So if you create a grid with the swapped shape (`n` rows of length `m`), copying every cell to its swapped position is the whole job.

This is also the first half of the in-place rotation trick used later in this pattern. For a square grid the swap can be done inside the same grid; for a rectangle the shape changes, so you need a new grid.

### Step by step

1. Read `rows = matrix.length` and `cols = matrix[0].length`.
2. Create `result` with `cols` rows, each of length `rows`. Build every row with its own array.
3. For each `i` in `0..rows-1` and each `j` in `0..cols-1`, set `result[j][i] = matrix[i][j]`.
4. Return `result`.

### Dry run: [[1, 2, 3], [4, 5, 6]]

| i | j | value | written to |
|---|---|---|---|
| 0 | 0 | 1 | result[0][0] |
| 0 | 1 | 2 | result[1][0] |
| 0 | 2 | 3 | result[2][0] |
| 1 | 0 | 4 | result[0][1] |
| 1 | 1 | 5 | result[1][1] |
| 1 | 2 | 6 | result[2][1] |

The result is [[1, 4], [2, 5], [3, 6]]: 3 rows of length 2.

### Edge cases

- A single row becomes a single column, and the other way round.
- A 1 x 1 grid is its own transpose.

### Common mistakes

- Allocating the result as `rows x cols` instead of `cols x rows`.
- Building the result with `new Array(cols).fill(new Array(rows))`, which makes every row the same array.
- Trying to swap in place on a non-square grid: the cells do not map onto themselves.
