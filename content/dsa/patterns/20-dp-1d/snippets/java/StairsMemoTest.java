final class StairsMemoTest {
    public static void main(String[] args) {
        Check.test("memoized recursion matches the known answers", () -> {
            Check.eq(6, StairsMemo.minCostMemo(new int[] {1, 4, 2, 3, 1, 5, 2}));
            Check.eq(15, StairsMemo.minCostMemo(new int[] {10, 15, 20}));
            Check.eq(10, StairsMemo.minCostMemo(new int[] {10, 15}));
            Check.eq(0, StairsMemo.minCostMemo(new int[] {5}));
        });

        Check.test("memoized recursion stays fast on a long staircase", () -> {
            int[] cost = new int[2000];
            for (int i = 0; i < cost.length; i++) cost[i] = (i * 7) % 10;
            int a = 0, b = 0;
            for (int i = 2; i <= cost.length; i++) {
                int next = Math.min(b + cost[i - 1], a + cost[i - 2]);
                a = b;
                b = next;
            }
            Check.eq(b, StairsMemo.minCostMemo(cost));
        });

        Check.finish();
    }
}
