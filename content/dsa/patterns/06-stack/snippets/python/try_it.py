from matching import is_balanced, simplify_path  # @hide
from monotonic import next_greater_index, smaller_neighbours  # @hide
# Edit the inputs and press Run. These are the templates above.
print(is_balanced("{[()()]}"), is_balanced("([)]"))    # True False
print(simplify_path("/home//user/./docs/../pics/"))    # /home/user/pics

temps = [5, 2, 3, 1, 6, 4]
nxt = next_greater_index(temps)
print(nxt)                                             # [4, 2, 4, 4, -1, -1]
print([0 if j == -1 else j - i for i, j in enumerate(nxt)])   # days to wait: [4, 1, 2, 1, 0, 0]

left, right = smaller_neighbours([4, 6, 5, 2, 7, 3])
print(left, right)                                     # [-1, 0, 0, -1, 3, 3] [3, 2, 3, 6, 5, 6]
