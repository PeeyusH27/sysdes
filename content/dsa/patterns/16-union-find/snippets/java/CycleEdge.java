// Template 3: cycle detection in an undirected graph. Add the edges one by one; the first edge
// whose two ends already share a root closes a cycle (they were connected without it).
final class CycleEdge {
    private CycleEdge() {}

    static int[] firstCycleEdge(int n, int[][] edges) {
        UnionFind uf = new UnionFind(n);
        for (int[] e : edges) {
            if (!uf.union(e[0], e[1])) return new int[] {e[0], e[1]};
        }
        return null; // the edges form a forest
    }

    // A graph is a tree when it has exactly n - 1 edges and none of them closes a cycle.
    static boolean isTree(int n, int[][] edges) {
        return edges.length == n - 1 && firstCycleEdge(n, edges) == null;
    }
}
