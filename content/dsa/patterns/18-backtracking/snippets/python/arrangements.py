# Template 2: when order matters, every call may pick ANY item that is not already in the path.
# used[i] records whether items[i] is in the path, so the check is O(1). With k = len(items)
# this lists every permutation.
def arrangements(items, k=None):
    if k is None:
        k = len(items)
    result = []
    path = []
    used = [False] * len(items)

    def backtrack():
        if len(path) == k:
            result.append(path[:])
            return
        for i in range(len(items)):
            if used[i]:
                continue                 # already placed in this path
            used[i] = True               # choose
            path.append(items[i])
            backtrack()                  # explore
            path.pop()                   # un-choose: undo both changes
            used[i] = False

    backtrack()
    return result
