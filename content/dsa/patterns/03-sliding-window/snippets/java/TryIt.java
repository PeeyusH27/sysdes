import java.util.Arrays;

// Edit the inputs and run. These are the four templates on this page.
public class TryIt {
    public static void main(String[] args) {
        System.out.println(FixedWindow.maxWindowSum(new int[] {2, 1, 5, 1, 3, 2}, 3));                    // 9: the window [5, 1, 3]
        System.out.println(LongestWindow.longestAtMostKDistinct("abcbbca", 2));                           // 5: "bcbbc"
        System.out.println(ShortestWindow.shortestSumAtLeast(new int[] {3, 1, 4, 1, 5, 9}, 12));          // 2: [5, 9]
        System.out.println(Arrays.toString(WindowMax.windowMax(new int[] {5, 3, 4, 1, 6, 2, 2}, 3)));     // [5, 4, 6, 6, 6]
    }
}
