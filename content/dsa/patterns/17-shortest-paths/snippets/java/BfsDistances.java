import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class BfsDistances {
    // Template 1: BFS for unweighted graphs (every edge costs 1). Nodes leave the queue in order of
    // distance, so the first time a node is reached is along a shortest path.
    public static int[] bfsDistances(int n, int[][] edges, int source) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);              // undirected: drop this line for a directed graph
        }
        int[] dist = new int[n];
        Arrays.fill(dist, -1);                    // -1 = not reached (yet)
        dist[source] = 0;
        List<Integer> queue = new ArrayList<>();
        queue.add(source);
        for (int head = 0; head < queue.size(); head++) { // a head index: removing from the front is O(n)
            int u = queue.get(head);
            for (int v : adj.get(u)) {
                if (dist[v] != -1) continue;
                dist[v] = dist[u] + 1;            // mark when pushed so nothing is queued twice
                queue.add(v);
            }
        }
        return dist;
    }
}
