// Template 1: rotate by combining two simple moves. Transpose swaps (i, j) with (j, i); reversing every row
// then mirrors left to right. Transpose + reverse rows = 90 degrees clockwise, in place, O(1) extra space.
public final class Rotate {
    private Rotate() {}

    // A new grid, so it also works for rectangles: rows x cols becomes cols x rows.
    public static int[][] transpose(int[][] m) {
        int[][] out = new int[m[0].length][m.length];
        for (int i = 0; i < m.length; i++) {
            for (int j = 0; j < m[0].length; j++) out[j][i] = m[i][j];
        }
        return out;
    }

    private static void swapAcrossDiagonal(int[][] m) {
        for (int i = 0; i < m.length; i++) {
            for (int j = i + 1; j < m.length; j++) {   // j > i: swap each pair once
                int tmp = m[i][j];
                m[i][j] = m[j][i];
                m[j][i] = tmp;
            }
        }
    }

    private static void reverseRows(int[][] m) {
        for (int[] row : m) {
            for (int a = 0, b = row.length - 1; a < b; a++, b--) {
                int tmp = row[a];
                row[a] = row[b];
                row[b] = tmp;
            }
        }
    }

    public static void rotateClockwise(int[][] m) {
        swapAcrossDiagonal(m);
        reverseRows(m);
    }

    public static void rotateCounterClockwise(int[][] m) {
        reverseRows(m);   // reverse first, then transpose, for the other direction
        swapAcrossDiagonal(m);
    }
}
