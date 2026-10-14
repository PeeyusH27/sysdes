from combinations import combinations  # @hide
from arrangements import arrangements  # @hide
from subset_sum import subsets_with_sum  # @hide
from grid_paths import count_paths  # @hide
# Edit the inputs and press Run. The functions are the templates above.
print(combinations(4, 2))             # [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]
print(["".join(p) for p in arrangements(["a", "b", "c"], 2)])  # ['ab', 'ac', 'ba', 'bc', 'ca', 'cb']
print(subsets_with_sum([4, 1, 3, 2], 5))  # [[1, 4], [2, 3]]

grid = [
    [0, 0, 0],
    [0, 1, 0],   # 1 is a wall
    [0, 0, 0],
]
print(count_paths(grid))              # 2: along the top and right, or down the left and along the bottom
