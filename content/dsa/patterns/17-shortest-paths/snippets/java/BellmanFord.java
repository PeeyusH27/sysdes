import java.util.Arrays;

public final class BellmanFord {
    /** Distance used for "unreachable". */
    public static final int INF = Integer.MAX_VALUE;

    // Template 3: Bellman-Ford. Each round relaxes every edge once, reading the previous round's
    // distances, so after r rounds dist[v] is the shortest path that uses at most r edges.
    // Negative weights are fine. Pass maxEdges = k + 1 for "at most k stops".
    public static int[] bellmanFord(int n, int[][] edges, int source, int maxEdges) {
        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        for (int round = 1; round <= maxEdges; round++) {
            int[] next = dist.clone();            // read from dist, write into next
            boolean changed = false;
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                // INF + w would overflow (and a negative w would "improve" an unreached node), so skip those.
                if (dist[u] != INF && dist[u] + w < next[v]) {
                    next[v] = dist[u] + w;
                    changed = true;
                }
            }
            dist = next;
            if (!changed) break;                  // nothing improved, so later rounds can't either
        }
        return dist;
    }

    public static int[] bellmanFord(int n, int[][] edges, int source) {
        return bellmanFord(n, edges, source, n - 1);
    }

    // After n - 1 rounds every shortest path is final. If an edge can still be relaxed,
    // a negative cycle is reachable and "shortest" is undefined.
    public static boolean hasNegativeCycle(int n, int[][] edges, int source) {
        int[] dist = bellmanFord(n, edges, source);
        for (int[] e : edges) {
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return true;
        }
        return false;
    }
}
