# Template 4: backtracking on a grid. Counts the paths from the top-left to the bottom-right cell that
# step only on open cells (0), move up/down/left/right, and never visit a cell twice.
# The grid itself is the visited set: mark a cell before exploring from it, restore it afterwards.
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def count_paths(grid):
    rows = len(grid)
    cols = len(grid[0])

    def explore(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != 0:
            return 0                             # off the board, wall or on the path
        if r == rows - 1 and c == cols - 1:
            return 1
        grid[r][c] = 2                           # choose: this cell is on the current path
        total = 0
        for dr, dc in DIRS:
            total += explore(r + dr, c + dc)     # explore
        grid[r][c] = 0                           # un-choose: free the cell for other paths
        return total

    return explore(0, 0)
