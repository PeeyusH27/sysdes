enum Mark {
    X(1), O(-1);

    final int weight;

    Mark(int weight) { this.weight = weight; }

    Mark other() { return this == X ? O : X; }
}

// Board knows the grid and whether a mark finishes a line. It keeps a running total per line
// (+1 for each X, -1 for each O), so a line is won exactly when its total reaches n or -n.
// Not thread-safe on its own: Game is the only writer, and it holds the lock.
final class Board {
    private final int n;
    private final Mark[][] cells;
    private final int[] rows;
    private final int[] cols;
    private int diag;  // cells where row == col
    private int anti;  // cells where row + col == n - 1
    private int filled;

    Board(int n) {
        this.n = n;
        this.cells = new Mark[n][n];
        this.rows = new int[n];
        this.cols = new int[n];
    }

    int size() { return n; }
    int filled() { return filled; }
    boolean isFull() { return filled == n * n; }
    Mark at(int r, int c) { return cells[r][c]; }

    boolean isFree(int r, int c) { return r >= 0 && r < n && c >= 0 && c < n && cells[r][c] == null; }

    // O(1) and read-only: would this mark complete a line? A mixed line can never reach n in absolute value.
    boolean wouldComplete(Mark mark, int r, int c) {
        int d = mark.weight;
        if (Math.abs(rows[r] + d) == n || Math.abs(cols[c] + d) == n) return true;
        if (r == c && Math.abs(diag + d) == n) return true;
        return r + c == n - 1 && Math.abs(anti + d) == n;
    }

    void place(Mark mark, int r, int c) { apply(r, c, mark, 1); }

    void clear(int r, int c) { apply(r, c, cells[r][c], -1); }  // the undo of place: same counters, opposite sign

    private void apply(int r, int c, Mark mark, int sign) {
        int d = mark.weight * sign;
        cells[r][c] = sign > 0 ? mark : null;
        filled += sign;
        rows[r] += d;
        cols[c] += d;
        if (r == c) diag += d;
        if (r + c == n - 1) anti += d;
    }
}
