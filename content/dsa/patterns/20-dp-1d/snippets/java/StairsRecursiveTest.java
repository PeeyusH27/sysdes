final class StairsRecursiveTest {
    public static void main(String[] args) {
        Check.test("plain recursion finds the cheapest way to the top", () -> {
            Check.eq(6, StairsRecursive.minCostRecursive(new int[] {1, 4, 2, 3, 1, 5, 2}));
            Check.eq(15, StairsRecursive.minCostRecursive(new int[] {10, 15, 20}));
            Check.eq(6, StairsRecursive.minCostRecursive(new int[] {1, 100, 1, 1, 1, 100, 1, 1, 100, 1}));
        });

        Check.test("plain recursion handles the smallest staircases", () -> {
            Check.eq(10, StairsRecursive.minCostRecursive(new int[] {10, 15}));
            Check.eq(0, StairsRecursive.minCostRecursive(new int[] {5}));
            Check.eq(0, StairsRecursive.minCostRecursive(new int[] {0, 0, 0, 0}));
        });

        Check.finish();
    }
}
