import math


# "Ending at i": dp[i] = the best answer whose LAST element is nums[i].
# dp[i] looks back at every j < i that may come right before i, so it costs O(n^2).
# The answer can end anywhere, so it is the best cell, not dp[n - 1].
# Here: the largest sum of a strictly increasing subsequence.
def max_sum_increasing(nums):
    if not nums:
        return 0
    dp = nums[:]  # nums[i] on its own is already a valid subsequence ending at i
    best = -math.inf
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + nums[i])  # extend the best chain ending at j
        best = max(best, dp[i])
    return best
