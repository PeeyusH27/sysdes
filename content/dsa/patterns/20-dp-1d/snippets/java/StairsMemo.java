import java.util.HashMap;
import java.util.Map;

public final class StairsMemo {
    // Form 2: top-down with a memo. The same recursion, but each best(i) is computed once and cached,
    // so there are only n + 1 real computations: O(n) time, O(n) memo + O(n) call stack.
    public static int minCostMemo(int[] cost) {
        return best(cost.length, cost, new HashMap<>());
    }

    private static int best(int i, int[] cost, Map<Integer, Integer> memo) {
        if (i <= 1) return 0;
        Integer cached = memo.get(i);            // an Integer, not an int: null means "not computed yet", and a cached 0 is still a hit
        if (cached != null) return cached;
        int value = Math.min(best(i - 1, cost, memo) + cost[i - 1], best(i - 2, cost, memo) + cost[i - 2]);
        memo.put(i, value);
        return value;
    }
}
