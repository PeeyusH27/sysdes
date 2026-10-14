import java.util.Arrays;

final class TryIt {
    public static void main(String[] args) {
        // Edit the intervals and run. The methods are the templates above.
        System.out.println(Arrays.deepToString(Merge.mergeIntervals(new int[][] {{7, 8}, {2, 4}, {10, 11}, {1, 3}, {4, 5}}))); // [[1, 5], [7, 8], [10, 11]]
        System.out.println(Arrays.deepToString(Merge.mergeIntervals(new int[][] {{1, 10}, {2, 3}})));                          // [[1, 10]]  (nested: keep the max end)

        int[][] meetings = {{1, 5}, {2, 6}, {4, 8}, {6, 9}, {8, 10}};
        System.out.println(SweepLine.maxOverlap(meetings) + " " + RoomsHeap.minRooms(meetings));                               // 3 3  (two ways, same answer)
        System.out.println(SweepLine.maxOverlap(new int[][] {{1, 3}, {3, 5}}));                                                // 1    (back to back is fine)
    }
}
