import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class SubsetSum {
    // Template 3: pruning. Lists every group of numbers (each used at most once) that adds up to target.
    // The numbers are positive and distinct. Sorting first means that once a number is too big for what
    // is left, every number after it is too: break, and the whole rest of the loop is skipped.
    public static List<List<Integer>> subsetsWithSum(int[] nums, int target) {
        int[] sorted = nums.clone();             // sort a copy, not the caller's array
        Arrays.sort(sorted);
        List<List<Integer>> result = new ArrayList<>();
        backtrack(sorted, 0, target, new ArrayList<>(), result);
        return result;
    }

    private static void backtrack(int[] sorted, int start, int remaining, List<Integer> path, List<List<Integer>> result) {
        if (remaining == 0) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int i = start; i < sorted.length; i++) {
            if (sorted[i] > remaining) break;    // prune this branch and all the ones after it
            path.add(sorted[i]);                 // choose
            backtrack(sorted, i + 1, remaining - sorted[i], path, result); // explore: i + 1, each number at most once
            path.remove(path.size() - 1);        // un-choose
        }
    }
}
