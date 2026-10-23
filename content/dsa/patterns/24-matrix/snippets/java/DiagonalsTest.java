import java.util.List;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out DiagonalsTest
final class DiagonalsTest {
    public static void main(String[] args) {
        Check.test("antiDiagonals groups cells by row plus column", () -> {
            Check.eq(Diagonals.antiDiagonals(new int[][] {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}), List.of(List.of(1), List.of(2, 4), List.of(3, 5, 7), List.of(6, 8), List.of(9)));
            Check.eq(Diagonals.antiDiagonals(new int[][] {{1, 2, 3}, {4, 5, 6}}), List.of(List.of(1), List.of(2, 4), List.of(3, 5), List.of(6)));
        });
        Check.test("diagonalOrder zig-zags starting up-right", () -> {
            Check.eq(Diagonals.diagonalOrder(new int[][] {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}), new int[] {1, 2, 4, 7, 5, 3, 6, 8, 9});
            Check.eq(Diagonals.diagonalOrder(new int[][] {{1, 2, 3}, {4, 5, 6}}), new int[] {1, 2, 4, 5, 3, 6});
            Check.eq(Diagonals.diagonalOrder(new int[][] {{1, 2}, {3, 4}, {5, 6}}), new int[] {1, 2, 3, 5, 4, 6});
        });
        Check.test("single row, single column and single cell", () -> {
            Check.eq(Diagonals.diagonalOrder(new int[][] {{1, 2, 3, 4}}), new int[] {1, 2, 3, 4});
            Check.eq(Diagonals.diagonalOrder(new int[][] {{1}, {2}, {3}}), new int[] {1, 2, 3});
            Check.eq(Diagonals.diagonalOrder(new int[][] {{9}}), new int[] {9});
        });
        Check.done();
    }
}
