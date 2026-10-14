import java.util.ArrayList;
import java.util.List;

public final class Arrangements {
    // Template 2: when order matters, every call may pick ANY item that is not already in the path.
    // used[i] records whether items[i] is in the path, so the check is O(1). With k = items.size()
    // this lists every permutation.
    public static <T> List<List<T>> arrangements(List<T> items, int k) {
        List<List<T>> result = new ArrayList<>();
        backtrack(items, k, new ArrayList<>(), new boolean[items.size()], result);
        return result;
    }

    public static <T> List<List<T>> arrangements(List<T> items) {
        return arrangements(items, items.size());
    }

    private static <T> void backtrack(List<T> items, int k, List<T> path, boolean[] used, List<List<T>> result) {
        if (path.size() == k) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int i = 0; i < items.size(); i++) {
            if (used[i]) continue;               // already placed in this path
            used[i] = true;                      // choose
            path.add(items.get(i));
            backtrack(items, k, path, used, result); // explore
            path.remove(path.size() - 1);        // un-choose: undo both changes
            used[i] = false;
        }
    }
}
