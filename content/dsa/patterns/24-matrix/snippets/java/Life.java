// Template 4: simulation with state encoding. All cells change at once, so decisions must use the OLD board.
// Encode old and new state in one number: 0 dead, 1 alive, 2 alive -> dead, 3 dead -> alive.
// Eight directions as (row, column) steps: the direction-array idiom for every grid walk.
public final class Life {
    private Life() {}

    private static final int[][] NEIGHBOURS = {{-1, -1}, {-1, 0}, {-1, 1}, {0, -1}, {0, 1}, {1, -1}, {1, 0}, {1, 1}};

    private static int aliveNeighbours(int[][] board, int r, int c) {
        int live = 0;
        for (int[] d : NEIGHBOURS) {
            int nr = r + d[0];
            int nc = c + d[1];
            if (nr < 0 || nr >= board.length || nc < 0 || nc >= board[0].length) continue;
            if (board[nr][nc] == 1 || board[nr][nc] == 2) live++;   // 2 was alive in the old generation
        }
        return live;
    }

    public static void gameOfLife(int[][] board) {
        for (int r = 0; r < board.length; r++) {
            for (int c = 0; c < board[0].length; c++) {
                int live = aliveNeighbours(board, r, c);
                if (board[r][c] == 1 && (live < 2 || live > 3)) board[r][c] = 2;   // dies
                else if (board[r][c] == 0 && live == 3) board[r][c] = 3;   // is born
            }
        }
        for (int[] row : board) {
            for (int c = 0; c < row.length; c++) row[c] = (row[c] == 1 || row[c] == 3) ? 1 : 0;   // keep the new state
        }
    }

    // The simple alternative: write into a copy, read from the original. O(rows * columns) extra space.
    public static int[][] nextGeneration(int[][] board) {
        int[][] next = new int[board.length][];
        for (int r = 0; r < board.length; r++) next[r] = board[r].clone();
        for (int r = 0; r < board.length; r++) {
            for (int c = 0; c < board[0].length; c++) {
                int live = aliveNeighbours(board, r, c);
                if (board[r][c] == 1) next[r][c] = (live == 2 || live == 3) ? 1 : 0;
                else next[r][c] = live == 3 ? 1 : 0;
            }
        }
        return next;
    }
}
