final class ShortestWindowTest {
    public static void main(String[] args) {
        Check.test("shortest window whose sum reaches the target", () -> {
            Check.eq(ShortestWindow.shortestSumAtLeast(new int[] {3, 1, 4, 1, 5, 9}, 12), 2); // [5, 9]
            Check.eq(ShortestWindow.shortestSumAtLeast(new int[] {1, 1, 1, 1}, 3), 3);
            Check.eq(ShortestWindow.shortestSumAtLeast(new int[] {10}, 7), 1);
        });
        Check.test("returns 0 when nothing reaches the target", () -> {
            Check.eq(ShortestWindow.shortestSumAtLeast(new int[] {1, 2, 3}, 7), 0);
            Check.eq(ShortestWindow.shortestSumAtLeast(new int[] {}, 1), 0);
        });
        Check.done();
    }
}
