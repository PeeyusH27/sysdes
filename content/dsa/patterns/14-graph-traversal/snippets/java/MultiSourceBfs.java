import java.util.*;

// Template 3: multi-source BFS. Every source starts in the queue at distance 0, so one pass gives each cell its
// distance to the NEAREST source. Grid of strings: "E" exit (a source), "." open, "#" wall; -1 = unreachable.
final class MultiSourceBfs {
    private MultiSourceBfs() {}

    static int[][] distanceToNearest(String[] grid) {
        int rows = grid.length;
        int cols = grid[0].length();
        int[][] dist = new int[rows][cols];
        for (int[] row : dist) Arrays.fill(row, -1);
        Deque<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r].charAt(c) == 'E') {
                    dist[r][c] = 0;                       // all sources are seeded (and marked) together
                    queue.add(new int[] {r, c});
                }
            }
        }
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            int r = cell[0], c = cell[1];
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                if (grid[nr].charAt(nc) != '.' || dist[nr][nc] != -1) continue;
                dist[nr][nc] = dist[r][c] + 1;            // first discovery = nearest source
                queue.add(new int[] {nr, nc});
            }
        }
        return dist;
    }
}
