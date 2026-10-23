// Template 5a: binary search on a matrix. If each row starts above the previous row's end, the grid read row by
// row is one sorted list: search positions 0..rows*cols-1 and convert a position to (row, column).
public final class SortedMatrix {
    private SortedMatrix() {}

    public static boolean searchFlat(int[][] m, int target) {
        int cols = m[0].length;
        int lo = 0;
        int hi = m.length * cols - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            int value = m[mid / cols][mid % cols];
            if (value == target) return true;
            if (value < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }

    // If rows and columns are each sorted but rows do not chain, walk a staircase from the top-right corner:
    // too big means nothing below-left of here can match in this column, so go left; too small, go down.
    public static boolean searchStaircase(int[][] m, int target) {
        int r = 0;
        int c = m[0].length - 1;
        while (r < m.length && c >= 0) {
            if (m[r][c] == target) return true;
            if (m[r][c] > target) c--;
            else r++;
        }
        return false;
    }
}
