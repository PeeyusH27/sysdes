from merge import merge_intervals  # @hide
from sweep_line import max_overlap  # @hide
from rooms_heap import min_rooms  # @hide
# Edit the intervals and press Run. The functions are the templates above.
print(merge_intervals([[7, 8], [2, 4], [10, 11], [1, 3], [4, 5]]))  # [[1, 5], [7, 8], [10, 11]]
print(merge_intervals([[1, 10], [2, 3]]))                           # [[1, 10]]  (nested: keep the max end)

meetings = [[1, 5], [2, 6], [4, 8], [6, 9], [8, 10]]
print(max_overlap(meetings), min_rooms(meetings))                   # 3 3  (two ways, same answer)
print(max_overlap([[1, 3], [3, 5]]))                                # 1    (back to back is fine)
