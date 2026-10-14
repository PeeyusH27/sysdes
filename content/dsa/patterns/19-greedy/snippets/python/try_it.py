from sort_then_greedy import find_content_children  # @hide
from interval_scheduling import max_non_overlapping  # @hide
from coins import greedy_change, min_coins  # @hide
# Edit the inputs and press Run. The functions are the templates above.
print(find_content_children([3, 1, 6, 2, 4], [2, 1, 5, 3, 1]))        # 4
print(max_non_overlapping([[5, 9], [1, 3], [6, 8], [2, 5], [8, 10], [4, 6]]))  # 4

print(greedy_change([25, 10, 5, 1], 68), min_coins([25, 10, 5, 1], 68))  # [25, 25, 10, 5, 1, 1, 1] 7
print(greedy_change([4, 3, 1], 6), min_coins([4, 3, 1], 6))              # [4, 1, 1] 2  (greedy is wrong here)
