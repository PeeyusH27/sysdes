import java.util.Arrays;

// Edit the inputs and run. These are the four templates on this page.
public class TryIt {
    public static void main(String[] args) {
        int[] prefix = PrefixSums.buildPrefix(new int[] {3, 1, 4, 1, 5, 9});
        System.out.println(Arrays.toString(prefix));                                          // [0, 3, 4, 8, 9, 14, 23]
        System.out.println(PrefixSums.rangeSum(prefix, 2, 4));                                // 10: 4 + 1 + 5

        System.out.println(PrefixMap.longestSubarrayWithSum(new int[] {2, -1, 3, -2, 1, 4}, 3)); // 5: [2, -1, 3, -2, 1]

        int[][] P = Prefix2D.buildPrefix2D(new int[][] {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}});
        System.out.println(Prefix2D.rectSum(P, 1, 1, 2, 2));                                  // 28: 5 + 6 + 8 + 9

        int[][] updates = {{1, 3, 2}, {2, 5, 3}, {0, 1, -1}};
        System.out.println(Arrays.toString(DifferenceArray.applyRangeAdds(6, updates)));       // [-1, 1, 5, 5, 3, 3]
    }
}
