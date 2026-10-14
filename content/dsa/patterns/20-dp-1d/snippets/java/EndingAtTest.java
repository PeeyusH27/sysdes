final class EndingAtTest {
    public static void main(String[] args) {
        Check.test("picks the increasing subsequence with the largest sum", () -> {
            Check.eq(18, EndingAt.maxSumIncreasing(new int[] {4, 6, 1, 3, 8, 4, 6})); // 4 + 6 + 8
            Check.eq(106, EndingAt.maxSumIncreasing(new int[] {1, 101, 2, 3, 100}));  // 1 + 2 + 3 + 100
            Check.eq(10, EndingAt.maxSumIncreasing(new int[] {10, 5, 4, 3}));
        });

        Check.test("handles empty, equal and negative values", () -> {
            Check.eq(0, EndingAt.maxSumIncreasing(new int[0]));
            Check.eq(7, EndingAt.maxSumIncreasing(new int[] {7, 7, 7}));  // strictly increasing: equal values can't chain
            Check.eq(-1, EndingAt.maxSumIncreasing(new int[] {-3, -1, -2}));
        });

        Check.finish();
    }
}
