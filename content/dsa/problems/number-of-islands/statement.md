You are given a map as an `m x n` grid of strings, where `"1"` is land and `"0"` is water. An **island** is a group of land cells joined horizontally or vertically; cells that only touch at a corner are not joined. Everything outside the grid is water.

Return the number of islands.

You may modify `grid`. The grid can also be empty (`[]`), in which case there are no islands.

### Constraints

- `0 <= m <= 300` and, when `m > 0`, `1 <= n <= 300`
- `grid[r][c]` is the string `"0"` or `"1"`
