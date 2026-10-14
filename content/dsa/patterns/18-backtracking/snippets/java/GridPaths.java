public final class GridPaths {
    // Template 4: backtracking on a grid. Counts the paths from the top-left to the bottom-right cell that
    // step only on open cells (0), move up/down/left/right, and never visit a cell twice.
    // The grid itself is the visited set: mark a cell before exploring from it, restore it afterwards.
    private static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    public static int countPaths(int[][] grid) {
        return explore(grid, 0, 0);
    }

    private static int explore(int[][] grid, int r, int c) {
        int rows = grid.length;
        int cols = grid[0].length;
        if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != 0) return 0; // off the board, wall or on the path
        if (r == rows - 1 && c == cols - 1) return 1;
        grid[r][c] = 2;                          // choose: this cell is on the current path
        int total = 0;
        for (int[] d : DIRS) total += explore(grid, r + d[0], c + d[1]); // explore
        grid[r][c] = 0;                          // un-choose: free the cell for other paths
        return total;
    }
}
