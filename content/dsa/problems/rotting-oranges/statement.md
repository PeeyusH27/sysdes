Each cell of an `m x n` grid holds one of three values:

- `0`: an empty cell
- `1`: a fresh orange
- `2`: a rotten orange

Every minute, each fresh orange that is directly above, below, left or right of a rotten orange becomes rotten. All the rotten oranges spread at the same time.

Return the number of minutes that pass until no fresh orange is left. If some fresh orange can never rot, return `-1`. If there are no fresh oranges at the start, the answer is `0`.

### Constraints

- `1 <= m, n <= 10`
- `grid[r][c]` is `0`, `1` or `2`
