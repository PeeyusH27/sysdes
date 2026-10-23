// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out RotateTest
final class RotateTest {
    public static void main(String[] args) {
        Check.test("transpose flips rows and columns, including rectangles", () -> {
            Check.eq(Rotate.transpose(new int[][] {{1, 2, 3}, {4, 5, 6}}), new int[][] {{1, 4}, {2, 5}, {3, 6}});
            Check.eq(Rotate.transpose(new int[][] {{7}}), new int[][] {{7}});
            Check.eq(Rotate.transpose(new int[][] {{1}, {2}, {3}}), new int[][] {{1, 2, 3}});
        });
        Check.test("rotateClockwise turns the grid in place", () -> {
            int[][] m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
            Rotate.rotateClockwise(m);
            Check.eq(m, new int[][] {{7, 4, 1}, {8, 5, 2}, {9, 6, 3}});
            int[][] one = {{5}};
            Rotate.rotateClockwise(one);
            Check.eq(one, new int[][] {{5}});
        });
        Check.test("counter-clockwise undoes clockwise and four turns return the start", () -> {
            int[][] m = {{1, 2}, {3, 4}};
            Rotate.rotateCounterClockwise(m);
            Check.eq(m, new int[][] {{2, 4}, {1, 3}});
            Rotate.rotateClockwise(m);
            Check.eq(m, new int[][] {{1, 2}, {3, 4}});
            for (int k = 0; k < 4; k++) Rotate.rotateClockwise(m);
            Check.eq(m, new int[][] {{1, 2}, {3, 4}});
        });
        Check.done();
    }
}
