# Form 2: top-down with a memo. The same recursion, but each best(i) is computed once and cached,
# so there are only n + 1 real computations: O(n) time, O(n) memo + O(n) call stack.
# (CPython allows about 1000 nested calls by default; raise it with sys.setrecursionlimit for longer staircases.)
def min_cost_memo(cost):
    memo = {}

    def best(i):
        if i <= 1:
            return 0
        if i in memo:  # `in`, not a truthiness check: a cached 0 is still a hit
            return memo[i]
        value = min(best(i - 1) + cost[i - 1], best(i - 2) + cost[i - 2])
        memo[i] = value
        return value

    return best(len(cost))
