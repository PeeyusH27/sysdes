# Form 4: rolling variables. dp[i] only reads dp[i - 1] and dp[i - 2], so keep just those two: O(1) space.
def min_cost_rolling(cost):
    two_back = 0  # dp[i - 2]
    one_back = 0  # dp[i - 1]
    for i in range(2, len(cost) + 1):
        current = min(one_back + cost[i - 1], two_back + cost[i - 2])
        two_back = one_back  # slide the window one step to the right
        one_back = current
    return one_back
