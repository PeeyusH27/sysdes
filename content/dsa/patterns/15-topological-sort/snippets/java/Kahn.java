import java.util.*;

// Template 1: Kahn's algorithm. Nodes are 0..n-1 and each edge {from, to} means "from must come before to".
// Repeatedly take a node with no remaining incoming edges. Returns a topological order, or [] if there is a cycle.
final class Kahn {
    private Kahn() {}

    static List<Integer> topoSortKahn(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indegree = new int[n];
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            indegree[e[1]]++;
        }
        Deque<Integer> queue = new ArrayDeque<>();
        for (int v = 0; v < n; v++) if (indegree[v] == 0) queue.add(v); // nothing has to come before these
        List<Integer> order = new ArrayList<>();
        while (!queue.isEmpty()) {
            int u = queue.poll();
            order.add(u);
            for (int v : adj.get(u)) {
                indegree[v]--;                       // the edge u -> v is used up
                if (indegree[v] == 0) queue.add(v);  // everything v waited for is now placed
            }
        }
        return order.size() == n ? order : List.of(); // nodes on (or behind) a cycle never reach in-degree 0
    }
}
