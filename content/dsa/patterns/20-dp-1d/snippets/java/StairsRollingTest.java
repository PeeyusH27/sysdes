final class StairsRollingTest {
    public static void main(String[] args) {
        Check.test("rolling variables match the known answers", () -> {
            Check.eq(6, StairsRolling.minCostRolling(new int[] {1, 4, 2, 3, 1, 5, 2}));
            Check.eq(15, StairsRolling.minCostRolling(new int[] {10, 15, 20}));
            Check.eq(10, StairsRolling.minCostRolling(new int[] {10, 15}));
            Check.eq(0, StairsRolling.minCostRolling(new int[] {5}));
        });

        Check.test("rolling variables agree with the full table on a long staircase", () -> {
            int[] cost = new int[50000];
            for (int i = 0; i < cost.length; i++) cost[i] = (int) (((long) i * 7919) % 100);
            Check.eq(StairsTable.minCostTable(cost), StairsRolling.minCostRolling(cost));
        });

        Check.finish();
    }
}
