import java.util.List;
import java.util.stream.Collectors;

// Edit the inputs and run main. The methods are the templates above.
public final class TryIt {
    public static void main(String[] args) {
        System.out.println(Combinations.combinations(4, 2));  // [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]
        System.out.println(Arrangements.arrangements(List.of("a", "b", "c"), 2).stream()
                .map(p -> String.join("", p)).collect(Collectors.toList())); // [ab, ac, ba, bc, ca, cb]
        System.out.println(SubsetSum.subsetsWithSum(new int[] {4, 1, 3, 2}, 5)); // [[1, 4], [2, 3]]

        int[][] grid = {
            {0, 0, 0},
            {0, 1, 0},   // 1 is a wall
            {0, 0, 0},
        };
        System.out.println(GridPaths.countPaths(grid));       // 2: along the top and right, or down the left and along the bottom
    }
}
