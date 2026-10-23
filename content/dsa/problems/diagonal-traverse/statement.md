Given a grid with `m` rows and `n` columns, return all of its values in **diagonal zig-zag order**. Start at the top-left cell and move along the anti-diagonals (cells whose row and column add up to the same number). The first diagonal is just the corner; the second is read from top-right to bottom-left; the third from bottom-left to top-right; and so on, alternating until the bottom-right cell.

For a 3 x 3 grid holding 1 to 9 in row order, the answer is `1, 2, 4, 7, 5, 3, 6, 8, 9`.

### Constraints

- `1 <= m, n <= 100`
- `-10^5 <= matrix[i][j] <= 10^5`
