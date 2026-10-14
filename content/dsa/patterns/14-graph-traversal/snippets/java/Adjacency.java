import java.util.*;

// Turn an edge list into an adjacency list once, up front: adj.get(u) is the list of u's neighbours, so
// looping over a node's neighbours costs O(its degree) instead of a scan over every edge.
final class Adjacency {
    private Adjacency() {}

    static List<List<Integer>> buildAdjacency(int n, int[][] edges, boolean directed) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>()); // n separate lists, one per node
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            if (!directed) adj.get(e[1]).add(e[0]);              // an undirected edge is stored in both directions
        }
        return adj;
    }

    // When nodes are strings or sparse numbers ("JFK", 10^9), key a map by node instead of indexing a list.
    // LinkedHashMap keeps the order nodes were first seen.
    static Map<String, List<String>> buildAdjacencyMap(String[][] edges, boolean directed) {
        Map<String, List<String>> adj = new LinkedHashMap<>();
        for (String[] e : edges) {
            add(adj, e[0], e[1]);
            if (directed) add(adj, e[1], null);                  // make sure sinks exist as keys too
            else add(adj, e[1], e[0]);
        }
        return adj;
    }

    private static void add(Map<String, List<String>> adj, String from, String to) {
        List<String> list = adj.computeIfAbsent(from, k -> new ArrayList<>());
        if (to != null) list.add(to);
    }
}
