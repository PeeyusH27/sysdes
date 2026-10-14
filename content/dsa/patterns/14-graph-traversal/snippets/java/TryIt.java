import java.util.*;

// Edit the inputs and run main. The functions are the templates above.
public class TryIt {
    public static void main(String[] args) {
        List<List<Integer>> adj = Adjacency.buildAdjacency(6, new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {4, 5}}, false);
        System.out.println(adj);                                          // [[1, 2], [0, 3], [0, 3], [1, 2], [5], [4]]
        System.out.println(Arrays.toString(Bfs.bfsDistances(adj, 0)));    // [0, 1, 1, 2, -1, -1]: 4 and 5 are unreachable

        Integer[][] land = {
            {1, 1, 0, 0, 1},
            {1, 0, 0, 1, 1},
            {0, 0, 1, 0, 1},
        };
        System.out.println(GridDfs.countRegions(land, 1) + " " + GridDfs.regionSizes(land, 1)); // 3 [3, 4, 1]

        String[] maze = {"..#.", ".##.", "...."};
        System.out.println(Bfs.gridSteps(maze, new int[] {0, 0}, new int[] {0, 3}));            // 7

        System.out.println(Arrays.deepToString(MultiSourceBfs.distanceToNearest(new String[] {"E..", ".#.", "..E"}))); // [[0, 1, 2], [1, -1, 1], [2, 1, 0]]
    }
}
