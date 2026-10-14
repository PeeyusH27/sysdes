final class IntervalSchedulingTest {
    public static void main(String[] args) {
        Check.test("keeps the most activities", () -> {
            Check.eq(4, IntervalScheduling.maxNonOverlapping(new int[][] {{5, 9}, {1, 3}, {6, 8}, {2, 5}, {8, 10}, {4, 6}}));
            Check.eq(3, IntervalScheduling.maxNonOverlapping(new int[][] {{1, 100}, {2, 3}, {4, 5}, {6, 7}}));
            Check.eq(2, IntervalScheduling.maxNonOverlapping(new int[][] {{1, 5}, {4, 7}, {6, 10}}));
        });

        Check.test("touching is fine; identical intervals keep one", () -> {
            Check.eq(3, IntervalScheduling.maxNonOverlapping(new int[][] {{1, 2}, {2, 3}, {3, 4}}));
            Check.eq(1, IntervalScheduling.maxNonOverlapping(new int[][] {{4, 6}, {4, 6}, {4, 6}}));
            Check.eq(0, IntervalScheduling.maxNonOverlapping(new int[0][]));
        });

        Check.finish();
    }
}
