import java.util.*;

final class GridDfs {
    private GridDfs() {}

    private static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    // Template 1a: recursive DFS on a grid. A grid is an implicit graph: cell (r, c) is a node and its
    // neighbours are the in-bounds cells one step away. Counts the regions of connected cells equal to `target`.
    static <T> int countRegions(T[][] grid, T target) {
        int rows = grid.length;
        int cols = rows > 0 ? grid[0].length : 0;
        boolean[][] seen = new boolean[rows][cols];
        int regions = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c].equals(target) && !seen[r][c]) {
                    regions++;                                   // nothing earlier reached it: a new region
                    dfs(grid, target, seen, r, c);
                }
            }
        }
        return regions;
    }

    private static <T> void dfs(T[][] grid, T target, boolean[][] seen, int r, int c) {
        seen[r][c] = true;                                       // mark before exploring further
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) continue; // off the grid
            if (seen[nr][nc] || !grid[nr][nc].equals(target)) continue;                  // visited, or not a region
            dfs(grid, target, seen, nr, nc);
        }
    }

    // Template 1b: the same flood with an explicit stack, so a huge region can't overflow the call stack.
    // Returns the size of every region in the order the scan finds them.
    static <T> List<Integer> regionSizes(T[][] grid, T target) {
        int rows = grid.length;
        int cols = rows > 0 ? grid[0].length : 0;
        boolean[][] seen = new boolean[rows][cols];
        List<Integer> sizes = new ArrayList<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (!grid[r][c].equals(target) || seen[r][c]) continue;
                seen[r][c] = true;                               // mark on push
                Deque<int[]> stack = new ArrayDeque<>();
                stack.push(new int[] {r, c});
                int size = 0;
                while (!stack.isEmpty()) {
                    int[] cell = stack.pop();
                    size++;
                    for (int[] d : DIRS) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                        if (seen[nr][nc] || !grid[nr][nc].equals(target)) continue;
                        seen[nr][nc] = true;
                        stack.push(new int[] {nr, nc});
                    }
                }
                sizes.add(size);
            }
        }
        return sizes;
    }
}
