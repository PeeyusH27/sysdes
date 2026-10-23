// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out SpiralTest
final class SpiralTest {
    public static void main(String[] args) {
        Check.test("spiralOrder reads a square grid clockwise", () -> {
            Check.eq(Spiral.spiralOrder(new int[][] {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}), new int[] {1, 2, 3, 6, 9, 8, 7, 4, 5});
        });
        Check.test("spiralOrder handles wide, tall and single-line grids without repeats", () -> {
            Check.eq(Spiral.spiralOrder(new int[][] {{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}}), new int[] {1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7});
            Check.eq(Spiral.spiralOrder(new int[][] {{1, 2}, {3, 4}, {5, 6}}), new int[] {1, 2, 4, 6, 5, 3});
            Check.eq(Spiral.spiralOrder(new int[][] {{1, 2, 3}}), new int[] {1, 2, 3});
            Check.eq(Spiral.spiralOrder(new int[][] {{1}, {2}, {3}}), new int[] {1, 2, 3});
        });
        Check.test("spiralFill writes 1..n*n along the spiral and spiralOrder reads it back in order", () -> {
            Check.eq(Spiral.spiralFill(3), new int[][] {{1, 2, 3}, {8, 9, 4}, {7, 6, 5}});
            Check.eq(Spiral.spiralFill(1), new int[][] {{1}});
            for (int n : new int[] {2, 4, 5}) {
                int[] want = new int[n * n];
                for (int i = 0; i < want.length; i++) want[i] = i + 1;
                Check.eq(Spiral.spiralOrder(Spiral.spiralFill(n)), want);
            }
        });
        Check.done();
    }
}
