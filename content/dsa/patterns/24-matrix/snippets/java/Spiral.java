// Template 2: layers and boundaries. Four walls frame the unread rectangle; after each side is read,
// that wall moves inward. The two guards stop a leftover single row or column being read twice.
public final class Spiral {
    private Spiral() {}

    public static int[] spiralOrder(int[][] m) {
        int[] out = new int[m.length * m[0].length];
        int k = 0;
        int top = 0;
        int bottom = m.length - 1;
        int left = 0;
        int right = m[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out[k++] = m[top][c];
            top++;
            for (int r = top; r <= bottom; r++) out[k++] = m[r][right];
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) out[k++] = m[bottom][c];
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) out[k++] = m[r][left];
                left++;
            }
        }
        return out;
    }

    // The same spiral written the other way round: a direction array and "turn when blocked", to fill 1..n*n.
    public static int[][] spiralFill(int n) {
        int[][] grid = new int[n][n];
        int[] dr = {0, 1, 0, -1};   // right, down, left, up
        int[] dc = {1, 0, -1, 0};
        int r = 0;
        int c = 0;
        int d = 0;
        for (int k = 1; k <= n * n; k++) {
            grid[r][c] = k;
            int nr = r + dr[d];
            int nc = c + dc[d];
            if (nr < 0 || nr >= n || nc < 0 || nc >= n || grid[nr][nc] != 0) d = (d + 1) % 4;   // blocked: turn right
            r += dr[d];
            c += dc[d];
        }
        return grid;
    }
}
