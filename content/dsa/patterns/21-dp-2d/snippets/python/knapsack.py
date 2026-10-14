# 0/1 knapsack in one row: each item at most once. dp[c] = best value with capacity c, using the items so far.
# Capacities go DOWN, so dp[c - w] is still the value from BEFORE this item: no item is counted twice.
def knapsack_01(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1):
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[capacity]


# Unbounded knapsack: each item as many times as you like.
# Capacities go UP, so dp[c - w] may already include this item, which is exactly what allows reuse.
def knapsack_unbounded(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for c in range(w, capacity + 1):
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[capacity]


# 0/1 knapsack with the full table, so the chosen items can be read back.
# dp[i][c] = best value using the first i items with capacity c. Item i was taken iff dp[i][c] != dp[i - 1][c].
def knapsack_items(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w = weights[i - 1]
        for c in range(capacity + 1):
            dp[i][c] = dp[i - 1][c]                                                # skip item i
            if w <= c:
                dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + values[i - 1])         # or take it once
    chosen = []
    c = capacity
    for i in range(n, 0, -1):
        if dp[i][c] != dp[i - 1][c]:
            chosen.append(i - 1)  # 0-based index of the item
            c -= weights[i - 1]
    return {"best": dp[n][capacity], "items": chosen[::-1]}
