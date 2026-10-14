import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class Knapsack {
    public record Result(int best, List<Integer> items) {}

    // 0/1 knapsack in one row: each item at most once. dp[c] = best value with capacity c, using the items so far.
    // Capacities go DOWN, so dp[c - w] is still the value from BEFORE this item: no item is counted twice.
    public static int knapsack01(int[] weights, int[] values, int capacity) {
        int[] dp = new int[capacity + 1];
        for (int i = 0; i < weights.length; i++) {
            for (int c = capacity; c >= weights[i]; c--) {
                dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
            }
        }
        return dp[capacity];
    }

    // Unbounded knapsack: each item as many times as you like.
    // Capacities go UP, so dp[c - w] may already include this item, which is exactly what allows reuse.
    public static int knapsackUnbounded(int[] weights, int[] values, int capacity) {
        int[] dp = new int[capacity + 1];
        for (int i = 0; i < weights.length; i++) {
            for (int c = weights[i]; c <= capacity; c++) {
                dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
            }
        }
        return dp[capacity];
    }

    // 0/1 knapsack with the full table, so the chosen items can be read back.
    // dp[i][c] = best value using the first i items with capacity c. Item i was taken iff dp[i][c] != dp[i - 1][c].
    public static Result knapsackItems(int[] weights, int[] values, int capacity) {
        int n = weights.length;
        int[][] dp = new int[n + 1][capacity + 1];
        for (int i = 1; i <= n; i++) {
            int w = weights[i - 1];
            for (int c = 0; c <= capacity; c++) {
                dp[i][c] = dp[i - 1][c];                                                      // skip item i
                if (w <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + values[i - 1]);   // or take it once
            }
        }
        List<Integer> chosen = new ArrayList<>();
        for (int i = n, c = capacity; i > 0; i--) {
            if (dp[i][c] != dp[i - 1][c]) {
                chosen.add(i - 1);                 // 0-based index of the item
                c -= weights[i - 1];
            }
        }
        Collections.reverse(chosen);
        return new Result(dp[n][capacity], chosen);
    }
}
