final class BellmanFordTest {
    static final int INF = BellmanFord.INF;

    public static void main(String[] args) {
        Check.test("handles a negative edge that fools Dijkstra", () -> {
            Check.eq(new int[] {0, 1, 5}, BellmanFord.bellmanFord(3, new int[][] {{0, 1, 2}, {0, 2, 5}, {2, 1, -4}}, 0));
            Check.eq(new int[] {0, 2, 5, 4}, BellmanFord.bellmanFord(4, new int[][] {{0, 1, 4}, {0, 2, 5}, {2, 1, -3}, {1, 3, 2}, {2, 3, 6}}, 0));
        });

        Check.test("limits the number of edges when asked", () -> {
            int[][] edges = {{0, 1, 1}, {1, 2, 1}, {2, 3, 1}, {0, 2, 5}, {0, 3, 9}};
            Check.eq(new int[] {0, 1, 5, 9}, BellmanFord.bellmanFord(4, edges, 0, 1));
            Check.eq(new int[] {0, 1, 2, 6}, BellmanFord.bellmanFord(4, edges, 0, 2)); // 0 -> 2 -> 3, not the 3-edge route
            Check.eq(new int[] {0, 1, 2, 3}, BellmanFord.bellmanFord(4, edges, 0));
        });

        Check.test("unreachable nodes stay at INF", () -> {
            Check.eq(new int[] {0, INF, INF}, BellmanFord.bellmanFord(3, new int[][] {{1, 2, 1}}, 0));
        });

        Check.test("detects a reachable negative cycle", () -> {
            Check.isTrue(BellmanFord.hasNegativeCycle(3, new int[][] {{0, 1, 1}, {1, 2, -2}, {2, 1, 1}}, 0));
            Check.isTrue(!BellmanFord.hasNegativeCycle(3, new int[][] {{0, 1, 1}, {1, 2, -2}, {2, 1, 3}}, 0));
        });

        Check.finish();
    }
}
