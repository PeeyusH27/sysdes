final class GridPathsTest {
    public static void main(String[] args) {
        Check.test("counts simple paths around walls", () -> {
            Check.eq(2, GridPaths.countPaths(new int[][] {{0, 0}, {0, 0}}));
            Check.eq(2, GridPaths.countPaths(new int[][] {{0, 0, 0}, {0, 1, 0}, {0, 0, 0}}));
            Check.eq(12, GridPaths.countPaths(new int[][] {{0, 0, 0}, {0, 0, 0}, {0, 0, 0}}));
            Check.eq(1, GridPaths.countPaths(new int[][] {{0, 1}, {0, 0}}));
        });

        Check.test("edge cases: one cell, blocked start, no way through", () -> {
            Check.eq(1, GridPaths.countPaths(new int[][] {{0}}));
            Check.eq(0, GridPaths.countPaths(new int[][] {{1, 0}, {0, 0}}));
            Check.eq(0, GridPaths.countPaths(new int[][] {{0, 1}, {1, 0}}));
        });

        Check.test("leaves the grid exactly as it found it", () -> {
            int[][] grid = {{0, 0, 0, 0}, {0, 1, 1, 0}, {0, 0, 0, 0}};
            int[][] copy = {{0, 0, 0, 0}, {0, 1, 1, 0}, {0, 0, 0, 0}};
            GridPaths.countPaths(grid);
            Check.eq(copy, grid);
        });

        Check.finish();
    }
}
