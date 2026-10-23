import java.util.ArrayList;
import java.util.List;

// Template 5b: diagonals. Cells on one anti-diagonal share r + c; cells on one main diagonal share r - c.
// Walk the sums in order, clip the row range to the grid, and reverse every other diagonal to zig-zag.
public final class Diagonals {
    private Diagonals() {}

    public static List<List<Integer>> antiDiagonals(int[][] m) {
        int rows = m.length;
        int cols = m[0].length;
        List<List<Integer>> out = new ArrayList<>();
        for (int sum = 0; sum <= rows + cols - 2; sum++) {
            List<Integer> diagonal = new ArrayList<>();
            for (int r = Math.max(0, sum - cols + 1); r <= Math.min(rows - 1, sum); r++) diagonal.add(m[r][sum - r]);
            out.add(diagonal);   // rows increasing: top-right to bottom-left
        }
        return out;
    }

    public static int[] diagonalOrder(int[][] m) {
        int[] out = new int[m.length * m[0].length];
        int k = 0;
        List<List<Integer>> diagonals = antiDiagonals(m);
        for (int sum = 0; sum < diagonals.size(); sum++) {
            List<Integer> diagonal = diagonals.get(sum);
            if (sum % 2 == 0) {
                for (int i = diagonal.size() - 1; i >= 0; i--) out[k++] = diagonal.get(i);   // even: bottom-left to top-right
            } else {
                for (int v : diagonal) out[k++] = v;
            }
        }
        return out;
    }
}
