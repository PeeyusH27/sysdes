// Template 3: marker row and column. Record "this row/column must be cleared" inside the grid itself (its first
// row and first column), instead of in extra arrays. Decide first, change later: never zero while scanning.
public final class Markers {
    private Markers() {}

    public static void setZeroes(int[][] m) {
        int rows = m.length;
        int cols = m[0].length;
        boolean firstRowZero = false;   // the markers live in row 0 and column 0, so remember if they held a zero
        boolean firstColZero = false;
        for (int j = 0; j < cols; j++) if (m[0][j] == 0) firstRowZero = true;
        for (int i = 0; i < rows; i++) if (m[i][0] == 0) firstColZero = true;

        for (int i = 1; i < rows; i++) {
            for (int j = 1; j < cols; j++) {
                if (m[i][j] == 0) {
                    m[i][0] = 0;   // mark row i
                    m[0][j] = 0;   // mark column j
                }
            }
        }
        for (int i = 1; i < rows; i++) {
            for (int j = 1; j < cols; j++) {
                if (m[i][0] == 0 || m[0][j] == 0) m[i][j] = 0;
            }
        }
        if (firstRowZero) for (int j = 0; j < cols; j++) m[0][j] = 0;   // only now is it safe to clear the markers
        if (firstColZero) for (int i = 0; i < rows; i++) m[i][0] = 0;
    }
}
