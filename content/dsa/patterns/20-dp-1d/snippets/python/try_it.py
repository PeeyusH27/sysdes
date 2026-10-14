from stairs_recursive import min_cost_recursive  # @hide
from stairs_memo import min_cost_memo  # @hide
from stairs_table import min_cost_table  # @hide
from stairs_rolling import min_cost_rolling  # @hide
from over_amount import num_squares  # @hide
# The same problem four ways. Edit cost and press Run: all four must agree.
cost = [1, 4, 2, 3, 1, 5, 2]
print(min_cost_recursive(cost), min_cost_memo(cost), min_cost_table(cost), min_cost_rolling(cost))  # 6 6 6 6

# Why the memo matters: count the calls each version makes on a 25-step staircase.
long = [(i * 7) % 10 for i in range(25)]
calls = {"plain": 0, "memo": 0}


def plain(i):
    calls["plain"] += 1
    return 0 if i <= 1 else min(plain(i - 1) + long[i - 1], plain(i - 2) + long[i - 2])


memo = {}


def cached(i):
    calls["memo"] += 1
    if i <= 1:
        return 0
    if i not in memo:
        memo[i] = min(cached(i - 1) + long[i - 1], cached(i - 2) + long[i - 2])
    return memo[i]


print(plain(25), f"{calls['plain']} calls")   # 41 242785 calls
print(cached(25), f"{calls['memo']} calls")   # 41 49 calls

# DP over an amount: the fewest perfect squares that add up to n.
print(num_squares(12), num_squares(13))       # 3 2
