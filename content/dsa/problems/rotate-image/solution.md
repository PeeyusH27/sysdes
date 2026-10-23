### Intuition

Rotating by 90 degrees moves every cell to a new spot, and cells move in cycles of four. You could swap four cells at a time, but the index arithmetic is easy to get wrong. A neater view splits the rotation into two moves that are each simple and each doable in place:

1. **Transpose**: flip over the main diagonal, so `(i, j)` goes to `(j, i)`.
2. **Reverse every row**: mirror left to right, so `(j, i)` goes to `(j, n-1-i)`.

Together `(i, j)` goes to `(j, n-1-i)`, which is exactly a clockwise quarter turn.

### Step by step

1. For each `i`, and each `j > i`, swap `matrix[i][j]` with `matrix[j][i]`. Only the cells above the diagonal are visited, so every pair is swapped once.
2. For each row, reverse it in place (`row.reverse()`).
3. Return nothing; the grid itself has been rotated.

### Dry run: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

| stage | grid |
|---|---|
| start | 1 2 3 / 4 5 6 / 7 8 9 |
| after transpose | 1 4 7 / 2 5 8 / 3 6 9 |
| after reversing rows | 7 4 1 / 8 5 2 / 9 6 3 |

The first row 1 2 3 is now the last column, read top to bottom.

### Why it works

A cell at `(i, j)` ends at `(j, n-1-i)`. For the top-left corner `(0, 0)` that is `(0, n-1)`, the top-right corner, which is where a clockwise turn sends it. Both steps swap values only within the grid, so the extra space is O(1).

### Common mistakes

- Looping `j` over the whole row in the transpose. Every pair gets swapped twice, which puts everything back.
- Reversing the **columns** instead of the rows, which gives a counter-clockwise turn.
- Assigning `matrix = newMatrix`. That rebinds a local variable and leaves the caller's grid unchanged.

### Other ways to solve it

Rotate four cells at a time, layer by layer: for each ring, for each offset, cycle the cells at the four corners. It is also O(n^2) time and O(1) space but needs careful index maths. For a counter-clockwise turn, reverse the rows first and then transpose, or transpose and then reverse the columns.
