import java.util.List;
import java.util.function.ToIntFunction;

final class GridPathsTest {
    static final int[][] OPEN_3X3 = {{0, 0, 0}, {0, 0, 0}, {0, 0, 0}};
    static final int[][] CENTRE_WALL = {{0, 0, 0}, {0, 1, 0}, {0, 0, 0}};

    static final List<ToIntFunction<int[][]>> FNS = List.of(GridPaths::countPaths, GridPaths::countPathsOneRow);

    public static void main(String[] args) {
        Check.test("counts right/down paths around walls", () -> {
            for (ToIntFunction<int[][]> fn : FNS) {
                Check.eq(6, fn.applyAsInt(OPEN_3X3));
                Check.eq(2, fn.applyAsInt(CENTRE_WALL));
                Check.eq(3, fn.applyAsInt(new int[][] {{0, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 0, 1}, {1, 0, 0, 0}}));
            }
        });

        Check.test("handles single cells and blocked corners", () -> {
            for (ToIntFunction<int[][]> fn : FNS) {
                Check.eq(1, fn.applyAsInt(new int[][] {{0}}));
                Check.eq(0, fn.applyAsInt(new int[][] {{1}}));
                Check.eq(0, fn.applyAsInt(new int[][] {{1, 0}, {0, 0}})); // the start is a wall
                Check.eq(0, fn.applyAsInt(new int[][] {{0, 0}, {0, 1}})); // the finish is a wall
                Check.eq(1, fn.applyAsInt(new int[][] {{0, 0, 0, 0, 0}}));
            }
        });

        Check.finish();
    }
}
