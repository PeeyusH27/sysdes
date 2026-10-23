import java.util.Arrays;

// Edit the grids and run. These are the templates above.
public class TryIt {
    public static void main(String[] args) {
        int[][] grid = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        System.out.println(Arrays.deepToString(Rotate.transpose(new int[][] {{1, 2, 3}, {4, 5, 6}})));   // [[1, 4], [2, 5], [3, 6]]
        int[][] r = new int[3][];
        for (int i = 0; i < 3; i++) r[i] = grid[i].clone();
        Rotate.rotateClockwise(r);
        System.out.println(Arrays.deepToString(r));   // [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
        System.out.println(Arrays.toString(Spiral.spiralOrder(grid)));   // [1, 2, 3, 6, 9, 8, 7, 4, 5]
        System.out.println(Arrays.deepToString(Spiral.spiralFill(3)));   // [[1, 2, 3], [8, 9, 4], [7, 6, 5]]
        System.out.println(Arrays.toString(Diagonals.diagonalOrder(grid)));   // [1, 2, 4, 7, 5, 3, 6, 8, 9]

        int[][] z = {{1, 1, 1}, {1, 0, 1}, {1, 1, 1}};
        Markers.setZeroes(z);
        System.out.println(Arrays.deepToString(z));   // [[1, 0, 1], [0, 0, 0], [1, 0, 1]]

        int[][] life = {{0, 1, 0}, {0, 1, 0}, {0, 1, 0}};
        Life.gameOfLife(life);
        System.out.println(Arrays.deepToString(life));   // [[0, 0, 0], [1, 1, 1], [0, 0, 0]]

        System.out.println(SortedMatrix.searchFlat(new int[][] {{1, 3, 5, 7}, {10, 11, 16, 20}}, 11) + " "
                + SortedMatrix.searchStaircase(new int[][] {{1, 4, 7}, {2, 5, 8}, {3, 6, 9}}, 6));   // true true
    }
}
