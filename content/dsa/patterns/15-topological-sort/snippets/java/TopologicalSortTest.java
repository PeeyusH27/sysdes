import java.util.*;

// Run from this folder:  javac -d /tmp/topo *.java && java -cp /tmp/topo TopologicalSortTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class TopologicalSortTest {
    public static void main(String[] args) {
        test("Kahn returns an order where every edge points forward", TopologicalSortTest::kahnForward);
        test("Kahn: nodes without edges still appear", TopologicalSortTest::kahnIsolated);
        test("Kahn: a cycle, a self-loop, or a node stuck behind a cycle gives []", TopologicalSortTest::kahnCycles);
        test("reversed finishing order respects every edge", TopologicalSortTest::dfsForward);
        test("reaching a finished (black) node is not a cycle", TopologicalSortTest::dfsDiamond);
        test("a back edge to a gray node is a cycle", TopologicalSortTest::dfsCycle);
        test("groups nodes into rounds", TopologicalSortTest::levels);
        test("a node waits for its longest chain, not its first prerequisite", TopologicalSortTest::longestChain);
        test("returns null when a cycle blocks some nodes", TopologicalSortTest::levelsCycle);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static boolean respects(List<Integer> order, int n, int[][] edges) {
        Map<Integer, Integer> pos = new HashMap<>();
        for (int i = 0; i < order.size(); i++) pos.put(order.get(i), i);
        if (order.size() != n || pos.size() != n) return false;
        for (int[] e : edges) if (pos.get(e[0]) >= pos.get(e[1])) return false;
        return true;
    }

    static void kahnForward() {
        int[][] edges = {{0, 2}, {1, 2}, {2, 3}, {1, 4}, {4, 3}};
        List<Integer> order = Kahn.topoSortKahn(5, edges);
        eq(order, List.of(0, 1, 2, 4, 3));
        check(respects(order, 5, edges));
    }

    static void kahnIsolated() {
        eq(Kahn.topoSortKahn(3, new int[][] {}), List.of(0, 1, 2));
        eq(Kahn.topoSortKahn(4, new int[][] {{3, 0}}), List.of(1, 2, 3, 0));
    }

    static void kahnCycles() {
        eq(Kahn.topoSortKahn(3, new int[][] {{0, 1}, {1, 2}, {2, 0}}), List.of());
        eq(Kahn.topoSortKahn(1, new int[][] {{0, 0}}), List.of());
        eq(Kahn.topoSortKahn(4, new int[][] {{0, 1}, {1, 2}, {2, 1}, {2, 3}}), List.of());
    }

    static void dfsForward() {
        int[][] edges = {{0, 2}, {1, 2}, {2, 3}, {1, 4}, {4, 3}};
        List<Integer> order = DfsTopo.topoSortDfs(5, edges);
        eq(order, List.of(1, 4, 0, 2, 3));
        check(respects(order, 5, edges));
    }

    static void dfsDiamond() {
        int[][] edges = {{0, 1}, {0, 2}, {1, 3}, {2, 3}}; // a diamond: 3 is reached twice
        check(respects(DfsTopo.topoSortDfs(4, edges), 4, edges));
        eq(DfsTopo.topoSortDfs(2, new int[][] {}), List.of(1, 0));
    }

    static void dfsCycle() {
        eq(DfsTopo.topoSortDfs(4, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 1}}), List.of());
        eq(DfsTopo.topoSortDfs(1, new int[][] {{0, 0}}), List.of());
    }

    static void levels() {
        eq(KahnLevels.topoLevels(5, new int[][] {{0, 2}, {1, 2}, {2, 3}, {1, 4}, {4, 3}}),
                List.of(List.of(0, 1), List.of(2, 4), List.of(3)));
        eq(KahnLevels.topoLevels(3, new int[][] {}), List.of(List.of(0, 1, 2)));
    }

    static void longestChain() {
        // 0 -> 3 directly, but also 0 -> 1 -> 2 -> 3, so 3 lands in round 4
        eq(KahnLevels.topoLevels(4, new int[][] {{0, 3}, {0, 1}, {1, 2}, {2, 3}}),
                List.of(List.of(0), List.of(1), List.of(2), List.of(3)));
    }

    static void levelsCycle() {
        eq(KahnLevels.topoLevels(4, new int[][] {{0, 1}, {1, 2}, {2, 1}, {0, 3}}), null);
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
