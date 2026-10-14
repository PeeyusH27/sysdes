import java.util.*;

final class Bfs {
    private Bfs() {}

    // Template 2: BFS from one start node. Nodes come out of the queue in order of distance, so the first time a
    // node is discovered is along a fewest-edges path. dist[v] = number of edges from start, or -1 if unreachable.
    static int[] bfsDistances(List<List<Integer>> adj, int start) {
        int[] dist = new int[adj.size()];
        Arrays.fill(dist, -1);                      // -1 doubles as "not visited"
        dist[start] = 0;                            // mark the start when it is enqueued
        Deque<Integer> queue = new ArrayDeque<>();
        queue.add(start);
        while (!queue.isEmpty()) {
            int node = queue.poll();
            for (int next : adj.get(node)) {
                if (dist[next] != -1) continue;     // already queued, so its distance is final
                dist[next] = dist[node] + 1;        // mark on enqueue
                queue.add(next);
            }
        }
        return dist;
    }

    // Fewest moves between two cells of a grid of strings ("." open, "#" wall), one level per step. -1 if blocked.
    static int gridSteps(String[] grid, int[] start, int[] target) {
        int sr = start[0], sc = start[1], tr = target[0], tc = target[1];
        int rows = grid.length;
        int cols = grid[0].length();
        if (grid[sr].charAt(sc) == '#' || grid[tr].charAt(tc) == '#') return -1;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        boolean[][] seen = new boolean[rows][cols];
        seen[sr][sc] = true;
        Deque<int[]> queue = new ArrayDeque<>();
        queue.add(new int[] {sr, sc});
        for (int steps = 0; !queue.isEmpty(); steps++) {
            int levelSize = queue.size();           // everything queued right now is `steps` moves away
            for (int i = 0; i < levelSize; i++) {
                int[] cell = queue.poll();
                int r = cell[0], c = cell[1];
                if (r == tr && c == tc) return steps;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                    if (seen[nr][nc] || grid[nr].charAt(nc) == '#') continue;
                    seen[nr][nc] = true;
                    queue.add(new int[] {nr, nc});
                }
            }
        }
        return -1;
    }
}
