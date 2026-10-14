final class Prefix2DTest {
    static final int[][] GRID = {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9},
    };

    public static void main(String[] args) {
        Check.test("builds the padded 2D prefix table", () -> {
            Check.eq(Prefix2D.buildPrefix2D(GRID), new int[][] {
                {0, 0, 0, 0},
                {0, 1, 3, 6},
                {0, 5, 12, 21},
                {0, 12, 27, 45},
            });
            Check.eq(Prefix2D.buildPrefix2D(new int[][] {}), new int[][] {{0}});
        });
        Check.test("answers rectangle sums in O(1)", () -> {
            int[][] P = Prefix2D.buildPrefix2D(GRID);
            Check.eq(Prefix2D.rectSum(P, 1, 1, 2, 2), 28); // 5 + 6 + 8 + 9
            Check.eq(Prefix2D.rectSum(P, 0, 0, 2, 2), 45);
            Check.eq(Prefix2D.rectSum(P, 2, 0, 2, 0), 7);
            Check.eq(Prefix2D.rectSum(P, 0, 1, 1, 2), 16); // 2 + 3 + 5 + 6
        });
        Check.done();
    }
}
