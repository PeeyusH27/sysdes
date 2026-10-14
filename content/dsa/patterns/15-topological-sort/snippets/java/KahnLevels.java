import java.util.*;

// Template 3: Kahn's algorithm one round at a time. Each round takes every node whose in-degree is 0 right now,
// e.g. every course you can take this semester. Returns the rounds (lists of nodes), or null on a cycle.
// The number of rounds is the number of nodes on the longest dependency chain.
final class KahnLevels {
    private KahnLevels() {}

    static List<List<Integer>> topoLevels(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indegree = new int[n];
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            indegree[e[1]]++;
        }
        List<Integer> round = new ArrayList<>();
        for (int v = 0; v < n; v++) if (indegree[v] == 0) round.add(v);
        List<List<Integer>> rounds = new ArrayList<>();
        int placed = 0;
        while (!round.isEmpty()) {
            rounds.add(round);
            placed += round.size();
            List<Integer> next = new ArrayList<>();
            for (int u : round) {
                for (int v : adj.get(u)) {
                    indegree[v]--;
                    if (indegree[v] == 0) next.add(v); // its last prerequisite was in this round
                }
            }
            round = next;
        }
        return placed == n ? rounds : null;
    }
}
