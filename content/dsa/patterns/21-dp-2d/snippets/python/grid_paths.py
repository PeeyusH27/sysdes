# Grid DP: dp[r][c] = number of ways to reach cell (r, c) from the top-left, moving only right or down.
# The last move came from above or from the left, so add those two cells. Walls (1) have 0 ways.
def count_paths(grid):
    rows = len(grid)
    cols = len(grid[0])
    dp = [[0] * cols for _ in range(rows)]  # NOT [[0] * cols] * rows: that repeats ONE shared row!
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                continue                     # a wall: no path ends here
            if r == 0 and c == 0:
                dp[r][c] = 1                 # the start: one way, standing still
            else:
                dp[r][c] = (dp[r - 1][c] if r > 0 else 0) + (dp[r][c - 1] if c > 0 else 0)
    return dp[rows - 1][cols - 1]


# The same table kept as ONE row. Before row[c] is updated it still holds the value from the row above,
# and row[c - 1] already holds the current row's value: exactly "above + left".
def count_paths_one_row(grid):
    cols = len(grid[0])
    row = [0] * cols
    row[0] = 1
    for cells in grid:
        for c in range(cols):
            if cells[c] == 1:
                row[c] = 0
            elif c > 0:
                row[c] += row[c - 1]
    return row[cols - 1]
