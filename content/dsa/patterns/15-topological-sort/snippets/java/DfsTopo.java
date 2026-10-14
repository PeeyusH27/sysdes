import java.util.*;

// Template 2: DFS with three colours. WHITE = not visited, GRAY = on the current path, BLACK = finished.
// An edge into a GRAY node closes a cycle. A node finishes after everything it points to, so the reversed
// finishing order is a topological order. Edges {from, to} mean "from before to". Returns [] on a cycle.
final class DfsTopo {
    private DfsTopo() {}

    private static final int WHITE = 0, GRAY = 1, BLACK = 2;

    static List<Integer> topoSortDfs(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        int[] color = new int[n];                    // all WHITE
        List<Integer> finished = new ArrayList<>();
        for (int u = 0; u < n; u++) {
            if (color[u] == WHITE && !visit(u, adj, color, finished)) return List.of();
        }
        Collections.reverse(finished);
        return finished;
    }

    private static boolean visit(int u, List<List<Integer>> adj, int[] color, List<Integer> finished) { // false if a cycle is reachable from u
        color[u] = GRAY;
        for (int v : adj.get(u)) {
            if (color[v] == GRAY) return false;                                       // back edge: v is still on the path
            if (color[v] == WHITE && !visit(v, adj, color, finished)) return false;   // BLACK: already finished, nothing to do
        }
        color[u] = BLACK;
        finished.add(u);                             // everything after u is already in `finished`
        return true;
    }
}
