final class BfsDistancesTest {
    public static void main(String[] args) {
        Check.test("distances are edge counts from the source", () -> {
            Check.eq(new int[] {0, 1, 1, 2, 3}, BfsDistances.bfsDistances(5, new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}}, 0));
            Check.eq(new int[] {1, 0, 1, 2}, BfsDistances.bfsDistances(4, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 0}}, 1));
        });

        Check.test("unreachable nodes stay -1", () -> {
            Check.eq(new int[] {0, 1, -1, -1}, BfsDistances.bfsDistances(4, new int[][] {{0, 1}}, 0));
            Check.eq(new int[] {0}, BfsDistances.bfsDistances(1, new int[0][], 0));
        });

        Check.finish();
    }
}
