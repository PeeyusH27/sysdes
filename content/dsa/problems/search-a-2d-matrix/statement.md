You are given a grid of integers with two properties: every row is sorted in non-decreasing order, and the first value of each row is **greater than the last value of the previous row**. Return `true` if `target` appears in the grid, otherwise `false`.

Aim for a running time of O(log(m * n)), where the grid has `m` rows and `n` columns.

### Constraints

- `1 <= m, n <= 100`
- `-10^4 <= matrix[i][j], target <= 10^4`
