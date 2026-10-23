// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out MarkersTest
final class MarkersTest {
    public static void main(String[] args) {
        Check.test("a zero in the middle clears its row and column", () -> {
            int[][] m = {{1, 1, 1}, {1, 0, 1}, {1, 1, 1}};
            Markers.setZeroes(m);
            Check.eq(m, new int[][] {{1, 0, 1}, {0, 0, 0}, {1, 0, 1}});
        });
        Check.test("zeros in the first row or column are not lost or invented", () -> {
            int[][] a = {{0, 1, 2, 0}, {3, 4, 5, 2}, {1, 3, 1, 5}};
            Markers.setZeroes(a);
            Check.eq(a, new int[][] {{0, 0, 0, 0}, {0, 4, 5, 0}, {0, 3, 1, 0}});
            int[][] b = {{1, 2, 3}, {0, 5, 6}, {7, 8, 9}};
            Markers.setZeroes(b);
            Check.eq(b, new int[][] {{0, 2, 3}, {0, 0, 0}, {0, 8, 9}});
        });
        Check.test("no zeros changes nothing and single lines work", () -> {
            int[][] m = {{1, 2}, {3, 4}};
            Markers.setZeroes(m);
            Check.eq(m, new int[][] {{1, 2}, {3, 4}});
            int[][] row = {{1, 0, 3}};
            Markers.setZeroes(row);
            Check.eq(row, new int[][] {{0, 0, 0}});
            int[][] col = {{5}, {0}, {7}};
            Markers.setZeroes(col);
            Check.eq(col, new int[][] {{0}, {0}, {0}});
        });
        Check.done();
    }
}
