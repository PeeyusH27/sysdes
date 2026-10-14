final class StairsTableTest {
    public static void main(String[] args) {
        Check.test("bottom-up table matches the known answers", () -> {
            Check.eq(6, StairsTable.minCostTable(new int[] {1, 4, 2, 3, 1, 5, 2}));
            Check.eq(6, StairsTable.minCostTable(new int[] {1, 100, 1, 1, 1, 100, 1, 1, 100, 1}));
            Check.eq(10, StairsTable.minCostTable(new int[] {10, 15}));
            Check.eq(0, StairsTable.minCostTable(new int[] {5}));
        });

        Check.test("bottom-up table agrees with plain recursion on small inputs", () -> {
            for (int n = 1; n <= 14; n++) {
                int[] cost = new int[n];
                for (int i = 0; i < n; i++) cost[i] = (i * 37 + n * 11) % 9;
                Check.eq(StairsRecursive.minCostRecursive(cost), StairsTable.minCostTable(cost));
            }
        });

        Check.finish();
    }
}
