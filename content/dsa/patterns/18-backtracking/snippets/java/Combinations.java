import java.util.ArrayList;
import java.util.List;

public final class Combinations {
    // Template 1: choose -> explore -> un-choose, with a start index.
    // Lists every way to pick k numbers from 1..n. Each call only picks numbers bigger than the last one,
    // so every combination is built exactly once ([1, 2] is never also built as [2, 1]).
    public static List<List<Integer>> combinations(int n, int k) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(1, n, k, new ArrayList<>(), result);
        return result;
    }

    private static void backtrack(int start, int n, int k, List<Integer> path, List<List<Integer>> result) {
        if (path.size() == k) {
            result.add(new ArrayList<>(path));   // record a copy: path keeps changing after this
            return;
        }
        for (int i = start; i <= n; i++) {
            path.add(i);                         // choose
            backtrack(i + 1, n, k, path, result); // explore: only numbers after i
            path.remove(path.size() - 1);        // un-choose, so the next i starts from the same path
        }
    }
}
