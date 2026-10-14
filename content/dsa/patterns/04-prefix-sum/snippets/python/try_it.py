from prefix_sums import build_prefix, range_sum  # @hide
from prefix_map import longest_subarray_with_sum  # @hide
from prefix_2d import build_prefix_2d, rect_sum  # @hide
from difference_array import apply_range_adds  # @hide
# Edit the inputs and press Run. These are the four templates on this page.
prefix = build_prefix([3, 1, 4, 1, 5, 9])
print(prefix)                                                  # [0, 3, 4, 8, 9, 14, 23]
print(range_sum(prefix, 2, 4))                                 # 10: 4 + 1 + 5

print(longest_subarray_with_sum([2, -1, 3, -2, 1, 4], 3))      # 5: [2, -1, 3, -2, 1]

P = build_prefix_2d([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
print(rect_sum(P, 1, 1, 2, 2))                                 # 28: 5 + 6 + 8 + 9

print(apply_range_adds(6, [[1, 3, 2], [2, 5, 3], [0, 1, -1]]))  # [-1, 1, 5, 5, 3, 3]
