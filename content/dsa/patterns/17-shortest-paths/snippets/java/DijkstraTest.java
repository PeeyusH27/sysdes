import java.util.List;

final class DijkstraTest {
    static final int INF = Dijkstra.INF;
    static final int[][] ROADS = {{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}, {2, 3, 5}, {3, 4, 3}};

    public static void main(String[] args) {
        Check.test("finds the shortest distance to every node", () -> {
            Check.eq(new int[] {0, 3, 1, 4, 7}, Dijkstra.dijkstra(5, ROADS, 0));
            Check.eq(new int[] {0, 0, 0}, Dijkstra.dijkstra(3, new int[][] {{0, 1, 0}, {1, 2, 0}}, 0)); // zero weights are fine
        });

        Check.test("unreachable nodes stay at INF", () -> {
            Check.eq(new int[] {0, INF, INF}, Dijkstra.dijkstra(3, new int[][] {{1, 0, 5}}, 0));
            Check.eq(new int[] {0}, Dijkstra.dijkstra(1, new int[0][], 0));
        });

        Check.test("rebuilds the path from prev pointers", () -> {
            Check.eq(new Dijkstra.PathResult(7, List.of(0, 2, 1, 3, 4)), Dijkstra.shortestPath(5, ROADS, 0, 4));
            Check.eq(new Dijkstra.PathResult(0, List.of(0)), Dijkstra.shortestPath(5, ROADS, 0, 0));
            Check.eq(new Dijkstra.PathResult(-1, List.of()), Dijkstra.shortestPath(3, new int[][] {{0, 1, 1}}, 0, 2));
        });

        Check.test("stopping at the target goes wrong with a negative edge", () -> {
            // 0 -> 2 -> 1 costs 5 - 4 = 1, but 1 is popped (and returned) at distance 2 first.
            Check.eq(new Dijkstra.PathResult(2, List.of(0, 1)), Dijkstra.shortestPath(3, new int[][] {{0, 1, 2}, {0, 2, 5}, {2, 1, -4}}, 0, 1));
        });

        Check.finish();
    }
}
