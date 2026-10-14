import math


# Greedy change-making: take the largest coin that fits, again and again. Returns the coins used, or None.
# Optimal for "canonical" systems like [25, 10, 5, 1], but not for arbitrary coins.
def greedy_change(coins, amount):
    used = []
    for coin in sorted(coins, reverse=True):
        while amount >= coin:
            amount -= coin
            used.append(coin)
    return used if amount == 0 else None


# The safe answer: dp[x] = fewest coins that make x, trying every coin as the last one. O(amount x coins).
def min_coins(coins, amount):
    dp = [math.inf] * (amount + 1)
    dp[0] = 0
    for x in range(1, amount + 1):
        for coin in coins:
            if coin <= x:
                dp[x] = min(dp[x], dp[x - coin] + 1)
    return -1 if dp[amount] == math.inf else dp[amount]
