import java.util.Arrays;

public final class OverAmount {
    // DP over an amount: dp[a] = the fewest perfect squares that add up to a.
    // Each cell tries every possible LAST piece (a square k^2 that fits) and reads the cell for what is left.
    // Swap the squares for a coin list and this is Coin Change; keep INF for amounts that can't be made
    // (and skip INF cells before adding 1, or the sum overflows).
    public static int numSquares(int n) {
        final int INF = Integer.MAX_VALUE;       // "not reachable (yet)"
        int[] dp = new int[n + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;                               // the amount 0 needs no pieces
        for (int a = 1; a <= n; a++) {
            for (int k = 1; k * k <= a; k++) {
                if (dp[a - k * k] != INF) dp[a] = Math.min(dp[a], dp[a - k * k] + 1);
            }
        }
        return dp[n];
    }
}
