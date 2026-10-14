import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class Dijkstra {
    /** Distance used for "unreachable". */
    public static final int INF = Integer.MAX_VALUE;

    public record PathResult(int dist, List<Integer> path) {}

    private static List<List<int[]>> adjacency(int n, int[][] edges) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(new int[] {e[1], e[2]}); // directed; also add {u, w} to adj[v] if undirected
        return adj;
    }

    // Template 2: Dijkstra for non-negative weights. Always expand the closest node not yet settled.
    // Lazy deletion: instead of updating an entry inside the heap, push a new one and skip
    // entries that are stale (a shorter distance was found after they were pushed).
    public static int[] dijkstra(int n, int[][] edges, int source) {
        List<List<int[]>> adj = adjacency(n, edges);
        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        MinHeap<int[]> heap = new MinHeap<>((a, b) -> Integer.compare(a[0], b[0]));
        heap.push(new int[] {0, source});
        while (heap.size() > 0) {
            int[] top = heap.pop();
            int d = top[0];
            int u = top[1];
            if (d > dist[u]) continue;            // stale entry: u was settled with a smaller distance
            for (int[] edge : adj.get(u)) {
                int v = edge[0];
                int w = edge[1];
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    heap.push(new int[] {dist[v], v});
                }
            }
        }
        return dist;                              // INF = unreachable
    }

    // The same loop with two extras: remember how each node was reached (prev) to rebuild the path,
    // and stop as soon as the target is popped, because a popped node's distance is final.
    public static PathResult shortestPath(int n, int[][] edges, int source, int target) {
        List<List<int[]>> adj = adjacency(n, edges);
        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        int[] prev = new int[n];
        Arrays.fill(prev, -1);
        dist[source] = 0;
        MinHeap<int[]> heap = new MinHeap<>((a, b) -> Integer.compare(a[0], b[0]));
        heap.push(new int[] {0, source});
        while (heap.size() > 0) {
            int[] top = heap.pop();
            int d = top[0];
            int u = top[1];
            if (d > dist[u]) continue;
            if (u == target) break;
            for (int[] edge : adj.get(u)) {
                int v = edge[0];
                int w = edge[1];
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    prev[v] = u;
                    heap.push(new int[] {dist[v], v});
                }
            }
        }
        if (dist[target] == INF) return new PathResult(-1, List.of());
        List<Integer> path = new ArrayList<>();
        for (int v = target; v != -1; v = prev[v]) path.add(v);
        Collections.reverse(path);
        return new PathResult(dist[target], path);
    }
}
