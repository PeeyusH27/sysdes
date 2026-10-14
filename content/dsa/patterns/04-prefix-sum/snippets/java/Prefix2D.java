// Template 3: 2D prefix sums. P[r][c] is the sum of the rectangle grid[0..r-1][0..c-1] (one extra row and
// column of zeros), so any rectangle sum is four lookups by inclusion-exclusion.
public final class Prefix2D {
    private Prefix2D() {}

    public static int[][] buildPrefix2D(int[][] grid) {
        int rows = grid.length;
        int cols = rows > 0 ? grid[0].length : 0;
        int[][] P = new int[rows + 1][cols + 1];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];   // the overlap was added twice
            }
        }
        return P;
    }

    // Sum of grid[r1..r2][c1..c2], all ends inclusive.
    public static int rectSum(int[][] P, int r1, int c1, int r2, int c2) {
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
    }
}
