import java.util.*;

final class CountGroups {
    private CountGroups() {}

    // Template 2: count groups. Start with n groups (every item alone); each union that really
    // merges two roots removes one group. Pairs inside an existing group change nothing.
    static int countGroups(int n, int[][] pairs) {
        UnionFind uf = new UnionFind(n);
        for (int[] p : pairs) uf.union(p[0], p[1]);
        return uf.count;
    }

    // The same loop answers "how big is each group?": bucket every item under its root.
    static List<List<Integer>> groupsOf(int n, int[][] pairs) {
        UnionFind uf = new UnionFind(n);
        for (int[] p : pairs) uf.union(p[0], p[1]);
        Map<Integer, List<Integer>> groups = new LinkedHashMap<>();
        for (int i = 0; i < n; i++) {
            int root = uf.find(i);   // always find(i), never parent[i]: a parent is not always a root
            groups.computeIfAbsent(root, r -> new ArrayList<>()).add(i);
        }
        return new ArrayList<>(groups.values());
    }
}
