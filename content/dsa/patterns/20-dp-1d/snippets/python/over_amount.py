import math


# DP over an amount: dp[a] = the fewest perfect squares that add up to a.
# Each cell tries every possible LAST piece (a square k^2 that fits) and reads the cell for what is left.
# Swap the squares for a coin list and this is Coin Change; keep math.inf for amounts that can't be made.
def num_squares(n):
    dp = [math.inf] * (n + 1)  # math.inf = "not reachable (yet)"
    dp[0] = 0                  # the amount 0 needs no pieces
    for a in range(1, n + 1):
        k = 1
        while k * k <= a:
            dp[a] = min(dp[a], dp[a - k * k] + 1)
            k += 1
    return dp[n]
