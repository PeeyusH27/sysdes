# Template 3: pruning. Lists every group of numbers (each used at most once) that adds up to target.
# The numbers are positive and distinct. Sorting first means that once a number is too big for what
# is left, every number after it is too: break, and the whole rest of the loop is skipped.
def subsets_with_sum(nums, target):
    ordered = sorted(nums)
    result = []
    path = []

    def backtrack(start, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(ordered)):
            if ordered[i] > remaining:
                break                            # prune this branch and all the ones after it
            path.append(ordered[i])              # choose
            backtrack(i + 1, remaining - ordered[i])  # explore: i + 1, each number at most once
            path.pop()                           # un-choose

    backtrack(0, target)
    return result
