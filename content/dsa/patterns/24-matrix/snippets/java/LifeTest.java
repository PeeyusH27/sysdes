// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out LifeTest
final class LifeTest {
    public static void main(String[] args) {
        Check.test("a blinker flips between a vertical and a horizontal bar", () -> {
            int[][] b = {{0, 1, 0}, {0, 1, 0}, {0, 1, 0}};
            Life.gameOfLife(b);
            Check.eq(b, new int[][] {{0, 0, 0}, {1, 1, 1}, {0, 0, 0}});
            Life.gameOfLife(b);
            Check.eq(b, new int[][] {{0, 1, 0}, {0, 1, 0}, {0, 1, 0}});
        });
        Check.test("a block is stable and a lone cell dies", () -> {
            int[][] block = {{1, 1}, {1, 1}};
            Life.gameOfLife(block);
            Check.eq(block, new int[][] {{1, 1}, {1, 1}});
            int[][] lone = {{1}};
            Life.gameOfLife(lone);
            Check.eq(lone, new int[][] {{0}});
        });
        Check.test("the in-place version matches the copying version", () -> {
            int[][] start = {{0, 1, 0}, {0, 0, 1}, {1, 1, 1}, {0, 0, 0}};
            int[][] want = Life.nextGeneration(start);
            Check.eq(want, new int[][] {{0, 0, 0}, {1, 0, 1}, {0, 1, 1}, {0, 1, 0}});
            int[][] b = new int[start.length][];
            for (int r = 0; r < start.length; r++) b[r] = start[r].clone();
            Life.gameOfLife(b);
            Check.eq(b, want);
        });
        Check.done();
    }
}
