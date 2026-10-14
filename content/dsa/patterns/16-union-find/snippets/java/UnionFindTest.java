import java.util.*;

// Run from this folder:  javac -d /tmp/uf *.java && java -cp /tmp/uf UnionFindTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class UnionFindTest {
    public static void main(String[] args) {
        test("union merges groups and count goes down once per merge", UnionFindTest::merges);
        test("union returns false when both items already share a root", UnionFindTest::sameRoot);
        test("union by rank hangs the shorter tree under the taller one", UnionFindTest::byRank);
        test("find compresses the path it walks", UnionFindTest::compression);
        test("a single item and an empty structure", UnionFindTest::tiny);
        test("counts components, including isolated items", UnionFindTest::counts);
        test("lists the members of every group", UnionFindTest::members);
        test("returns the edge that closes the first cycle", UnionFindTest::cycleEdge);
        test("returns null for a forest", UnionFindTest::forest);
        test("a tree needs n - 1 edges and no cycle", UnionFindTest::trees);
        test("groups string keys and tracks group sizes", UnionFindTest::keyedGroups);
        test("the smaller group joins the larger one", UnionFindTest::keyedBySize);
        test("works with grid cells encoded as strings", UnionFindTest::keyedCells);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void merges() {
        UnionFind uf = new UnionFind(6);
        eq(uf.count, 6);
        check(uf.union(0, 1));
        check(uf.union(2, 3));
        check(uf.union(1, 3));
        eq(uf.count, 3);
        check(uf.connected(0, 2));
        check(!uf.connected(0, 4));
    }

    static void sameRoot() {
        UnionFind uf = new UnionFind(3);
        uf.union(0, 1);
        uf.union(1, 2);
        check(!uf.union(2, 0));
        check(!uf.union(1, 1));
        eq(uf.count, 1);
    }

    static void byRank() {
        UnionFind uf = new UnionFind(5);
        uf.union(0, 1); // rank[0] = 1
        uf.union(0, 2); // 2 joins under 0, rank stays 1
        eq(uf.rank[0], 1);
        uf.union(3, 0); // rank[3] = 0 < rank[0] = 1, so 3 goes under 0
        eq(uf.parent[3], 0);
        eq(uf.rank[0], 1);
    }

    static void compression() {
        UnionFind uf = new UnionFind(5);
        int[] chain = {1, 2, 3, 4, 4}; // a hand-built chain 0 -> 1 -> 2 -> 3 -> 4
        System.arraycopy(chain, 0, uf.parent, 0, chain.length);
        eq(uf.find(0), 4);
        check(Arrays.equals(uf.parent, new int[] {4, 4, 4, 4, 4}));
    }

    static void tiny() {
        UnionFind one = new UnionFind(1);
        eq(one.find(0), 0);
        eq(one.count, 1);
        eq(new UnionFind(0).count, 0);
    }

    static void counts() {
        eq(CountGroups.countGroups(5, new int[][] {{0, 1}, {1, 2}, {3, 4}}), 2);
        eq(CountGroups.countGroups(6, new int[][] {{0, 1}, {1, 2}, {2, 0}, {3, 4}}), 3); // 2-0 closes a loop, 5 is alone
        eq(CountGroups.countGroups(4, new int[][] {}), 4);
        eq(CountGroups.countGroups(1, new int[][] {}), 1);
    }

    static void members() {
        List<List<Integer>> groups = new ArrayList<>();
        for (List<Integer> g : CountGroups.groupsOf(6, new int[][] {{0, 3}, {3, 5}, {1, 2}})) {
            List<Integer> sorted = new ArrayList<>(g);
            Collections.sort(sorted);
            groups.add(sorted);
        }
        groups.sort(Comparator.comparing(g -> g.get(0)));
        eq(groups, List.of(List.of(0, 3, 5), List.of(1, 2), List.of(4)));
    }

    static void cycleEdge() {
        check(Arrays.equals(CycleEdge.firstCycleEdge(4, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 1}}), new int[] {3, 1}));
        check(Arrays.equals(CycleEdge.firstCycleEdge(3, new int[][] {{0, 1}, {1, 2}, {0, 2}}), new int[] {0, 2}));
    }

    static void forest() {
        eq(CycleEdge.firstCycleEdge(5, new int[][] {{0, 1}, {2, 3}}), null);
        eq(CycleEdge.firstCycleEdge(1, new int[][] {}), null);
    }

    static void trees() {
        check(CycleEdge.isTree(5, new int[][] {{0, 1}, {0, 2}, {0, 3}, {1, 4}}));
        check(!CycleEdge.isTree(4, new int[][] {{0, 1}, {1, 2}, {2, 0}})); // right count, but a cycle and a lonely node
        check(!CycleEdge.isTree(4, new int[][] {{0, 1}, {2, 3}}));          // no cycle, but two pieces
        check(CycleEdge.isTree(1, new int[][] {}));
    }

    static void keyedGroups() {
        KeyedUnionFind<String> uf = new KeyedUnionFind<>();
        uf.union("ana@x.com", "ana@work.com");
        uf.union("ana@work.com", "a.dev@z.com");
        uf.union("ben@y.com", "ben@y.com");
        eq(uf.find("ana@x.com"), uf.find("a.dev@z.com"));
        eq(uf.sizeOf("ana@x.com"), 3);
        eq(uf.sizeOf("ben@y.com"), 1);
        check(!uf.union("a.dev@z.com", "ana@x.com"));
        List<List<String>> groups = new ArrayList<>();
        for (List<String> g : uf.groups()) {
            List<String> sorted = new ArrayList<>(g);
            Collections.sort(sorted);
            groups.add(sorted);
        }
        groups.sort((a, b) -> b.size() - a.size());
        eq(groups, List.of(List.of("a.dev@z.com", "ana@work.com", "ana@x.com"), List.of("ben@y.com")));
    }

    static void keyedBySize() {
        KeyedUnionFind<String> uf = new KeyedUnionFind<>();
        uf.union("a", "b");
        uf.union("a", "c"); // group of 3 rooted at a
        uf.union("z", "a"); // z (size 1) must go under a (size 3)
        eq(uf.find("z"), "a");
        eq(uf.sizeOf("z"), 4);
    }

    static void keyedCells() {
        KeyedUnionFind<String> uf = new KeyedUnionFind<>();
        uf.union("0,0", "0,1");
        uf.union("1,1", "0,1");
        eq(uf.sizeOf("1,1"), 3);
        eq(uf.find("2,2"), "2,2"); // unseen keys become their own group
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
