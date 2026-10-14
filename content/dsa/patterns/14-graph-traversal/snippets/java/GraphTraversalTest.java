import java.util.*;

// Run from this folder:  javac -d /tmp/graph *.java && java -cp /tmp/graph GraphTraversalTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class GraphTraversalTest {
    public static void main(String[] args) {
        test("undirected edges are stored both ways", GraphTraversalTest::undirected);
        test("directed edges are stored one way, isolated nodes get empty lists", GraphTraversalTest::directed);
        test("map version handles string labels and sinks", GraphTraversalTest::mapVersion);
        test("BFS distances in an undirected graph, -1 when unreachable", GraphTraversalTest::bfsUndirected);
        test("BFS on directed graphs only follows edges forwards", GraphTraversalTest::bfsDirected);
        test("fewest moves on a grid", GraphTraversalTest::gridSteps);
        test("counts and measures regions with 4-directional moves", GraphTraversalTest::regions);
        test("works for any target value, including strings", GraphTraversalTest::anyTarget);
        test("empty grids, no matches, one big region", GraphTraversalTest::edgeGrids);
        test("the iterative version survives a region too deep for recursion", GraphTraversalTest::bigRegion);
        test("every open cell gets the distance to its nearest exit", GraphTraversalTest::nearestExit);
        test("walled-off cells and walls stay -1", GraphTraversalTest::walledOff);
        test("no exits at all", GraphTraversalTest::noExits);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static List<List<Integer>> lists(int[]... rows) {
        List<List<Integer>> out = new ArrayList<>();
        for (int[] row : rows) {
            List<Integer> l = new ArrayList<>();
            for (int x : row) l.add(x);
            out.add(l);
        }
        return out;
    }

    static void undirected() {
        eq(Adjacency.buildAdjacency(4, new int[][] {{0, 1}, {1, 2}, {0, 2}}, false), lists(new int[] {1, 2}, new int[] {0, 2}, new int[] {1, 0}, new int[] {}));
    }

    static void directed() {
        List<List<Integer>> adj = Adjacency.buildAdjacency(3, new int[][] {{0, 1}, {0, 2}}, true);
        eq(adj, lists(new int[] {1, 2}, new int[] {}, new int[] {}));
        adj.get(1).add(9);
        eq(adj.get(2), List.of()); // rows are independent lists
    }

    static void mapVersion() {
        Map<String, List<String>> adj = Adjacency.buildAdjacencyMap(new String[][] {{"a", "b"}, {"b", "c"}}, true);
        eq(new ArrayList<>(adj.entrySet()), List.of(
                Map.entry("a", List.of("b")), Map.entry("b", List.of("c")), Map.entry("c", List.of())));
        eq(Adjacency.buildAdjacencyMap(new String[][] {{"x", "y"}}, false).get("y"), List.of("x"));
        eq(Adjacency.buildAdjacencyMap(new String[][] {}, false).size(), 0);
    }

    static void bfsUndirected() {
        List<List<Integer>> adj = lists(new int[] {1, 2}, new int[] {0, 3}, new int[] {0, 3, 4}, new int[] {1, 2, 5},
                new int[] {2, 5, 6}, new int[] {3, 4}, new int[] {4}, new int[] {});
        check(Arrays.equals(Bfs.bfsDistances(adj, 0), new int[] {0, 1, 1, 2, 2, 3, 3, -1}));
        check(Arrays.equals(Bfs.bfsDistances(adj, 7), new int[] {-1, -1, -1, -1, -1, -1, -1, 0}));
    }

    static void bfsDirected() {
        check(Arrays.equals(Bfs.bfsDistances(lists(new int[] {1}, new int[] {2}, new int[] {}, new int[] {0}), 0), new int[] {0, 1, 2, -1}));
    }

    static void gridSteps() {
        String[] maze = {"..#.", ".##.", "...."};
        eq(Bfs.gridSteps(maze, new int[] {0, 0}, new int[] {0, 3}), 7);
        eq(Bfs.gridSteps(maze, new int[] {0, 0}, new int[] {0, 0}), 0);
        eq(Bfs.gridSteps(maze, new int[] {0, 0}, new int[] {0, 2}), -1);                       // the target is a wall
        eq(Bfs.gridSteps(new String[] {".#.", ".#."}, new int[] {0, 0}, new int[] {1, 2}), -1); // walled off
    }

    static Integer[][] land() {
        return new Integer[][] {
            {1, 1, 0, 0, 1},
            {1, 0, 0, 1, 1},
            {0, 0, 1, 0, 0},
            {0, 1, 1, 0, 0},
        };
    }

    static void regions() {
        eq(GridDfs.countRegions(land(), 1), 3);
        eq(GridDfs.regionSizes(land(), 1), List.of(3, 3, 3));
        eq(GridDfs.countRegions(new Integer[][] {{1, 0}, {0, 1}}, 1), 2); // diagonals don't connect
    }

    static void anyTarget() {
        eq(GridDfs.countRegions(new String[][] {{"#", ".", "#"}, {"#", ".", "#"}}, "."), 1);
        eq(GridDfs.regionSizes(new String[][] {{"a", "a", "b"}, {"b", "a", "b"}}, "b"), List.of(2, 1));
    }

    static Integer[][] filled(int n) {
        Integer[][] g = new Integer[n][n];
        for (Integer[] row : g) Arrays.fill(row, 1);
        return g;
    }

    static void edgeGrids() {
        eq(GridDfs.countRegions(new Integer[][] {}, 1), 0);
        eq(GridDfs.regionSizes(new Integer[][] {{0, 0}, {0, 0}}, 1), List.of());
        eq(GridDfs.countRegions(filled(50), 1), 1);
        eq(GridDfs.regionSizes(filled(50), 1), List.of(2500));
    }

    static void bigRegion() {
        eq(GridDfs.regionSizes(filled(400), 1), List.of(160000));
    }

    static void nearestExit() {
        check(Arrays.deepEquals(MultiSourceBfs.distanceToNearest(new String[] {"E..#.", ".#...", ".#.#E", "....."}), new int[][] {
            {0, 1, 2, -1, 2},
            {1, -1, 3, 2, 1},
            {2, -1, 4, -1, 0},
            {3, 4, 3, 2, 1},
        }));
    }

    static void walledOff() {
        check(Arrays.deepEquals(MultiSourceBfs.distanceToNearest(new String[] {"E..#.", ".#.#.", "...#."}), new int[][] {
            {0, 1, 2, -1, -1},
            {1, -1, 3, -1, -1},
            {2, 3, 4, -1, -1},
        }));
    }

    static void noExits() {
        check(Arrays.deepEquals(MultiSourceBfs.distanceToNearest(new String[] {"..", ".#"}), new int[][] {{-1, -1}, {-1, -1}}));
    }

    // ---- a tiny test harness
    interface Body { void run() throws Exception; }

    private static int failed = 0;

    static void test(String name, Body body) {
        try {
            body.run();
            System.out.println("PASS  " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL  " + name + ": " + e);
        }
    }

    static void check(boolean condition) {
        if (!condition) throw new AssertionError("check failed");
    }

    static void eq(Object actual, Object expected) {
        if (!Objects.equals(actual, expected)) throw new AssertionError("expected " + expected + ", got " + actual);
    }
}
