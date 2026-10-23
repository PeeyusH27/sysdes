// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out SortedMatrixTest
final class SortedMatrixTest {
    private static final int[][] CHAINED = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};

    public static void main(String[] args) {
        Check.test("searchFlat treats the grid as one sorted list", () -> {
            for (int[] row : CHAINED) for (int v : row) Check.eq(SortedMatrix.searchFlat(CHAINED, v), true);
            for (int v : new int[] {0, 2, 13, 61}) Check.eq(SortedMatrix.searchFlat(CHAINED, v), false);
            Check.eq(SortedMatrix.searchFlat(new int[][] {{4}}, 4), true);
            Check.eq(SortedMatrix.searchFlat(new int[][] {{4}}, 5), false);
        });
        Check.test("searchStaircase works when only rows and columns are sorted", () -> {
            int[][] grid = {{1, 4, 7, 11}, {2, 5, 8, 12}, {3, 6, 9, 16}, {10, 13, 14, 17}};
            for (int[] row : grid) for (int v : row) Check.eq(SortedMatrix.searchStaircase(grid, v), true);
            for (int v : new int[] {0, 15, 18, 20}) Check.eq(SortedMatrix.searchStaircase(grid, v), false);
        });
        Check.test("both agree on a chained grid", () -> {
            for (int v = 0; v <= 62; v++) Check.eq(SortedMatrix.searchStaircase(CHAINED, v), SortedMatrix.searchFlat(CHAINED, v));
        });
        Check.done();
    }
}
