from fixed_window import max_window_sum  # @hide
from longest_window import longest_at_most_k_distinct  # @hide
from shortest_window import shortest_sum_at_least  # @hide
from window_max import window_max  # @hide
# Edit the inputs and press Run. These are the four templates on this page.
print(max_window_sum([2, 1, 5, 1, 3, 2], 3))          # 9: the window [5, 1, 3]
print(longest_at_most_k_distinct("abcbbca", 2))       # 5: "bcbbc"
print(shortest_sum_at_least([3, 1, 4, 1, 5, 9], 12))  # 2: [5, 9]
print(window_max([5, 3, 4, 1, 6, 2, 2], 3))           # [5, 4, 6, 6, 6]
