import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class Coins {
    // Greedy change-making: take the largest coin that fits, again and again. Returns the coins used, or null.
    // Optimal for "canonical" systems like [25, 10, 5, 1], but not for arbitrary coins.
    public static List<Integer> greedyChange(int[] coins, int amount) {
        int[] asc = coins.clone();               // sort a copy, then walk it from the largest coin down
        Arrays.sort(asc);
        List<Integer> used = new ArrayList<>();
        for (int i = asc.length - 1; i >= 0; i--) {
            int coin = asc[i];
            while (amount >= coin) {
                amount -= coin;
                used.add(coin);
            }
        }
        return amount == 0 ? used : null;
    }

    // The safe answer: dp[x] = fewest coins that make x, trying every coin as the last one. O(amount x coins).
    public static int minCoins(int[] coins, int amount) {
        final int INF = Integer.MAX_VALUE;       // stands in for Infinity: "not reachable (yet)"
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int x = 1; x <= amount; x++) {
            for (int coin : coins) {
                if (coin <= x && dp[x - coin] != INF) dp[x] = Math.min(dp[x], dp[x - coin] + 1);
            }
        }
        return dp[amount] == INF ? -1 : dp[amount];
    }
}
