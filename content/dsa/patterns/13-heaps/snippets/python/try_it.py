from heap import Heap  # @hide
from top_k import k_largest, k_smallest_by  # @hide
from k_way_merge import merge_sorted_arrays  # @hide
from two_heaps import running_medians  # @hide
# Edit the inputs and press Run. Heap and the helpers are the templates above.
heap = Heap(lambda a, b: a - b)           # min-heap; lambda a, b: b - a for a max-heap
for x in [5, 3, 8, 1, 4]:
    heap.push(x)
print(heap.peek(), heap.size())           # 1 5
print(heap.pop(), heap.pop(), heap.pop()) # 1 3 4

print(k_largest([3, 1, 5, 12, 2, 11, 7], 3))                      # [12, 11, 7]
dist = lambda p: p[0] * p[0] + p[1] * p[1]
print(k_smallest_by([(3, 3), (1, -2), (-4, 0), (0, 1)], 2, dist)) # [(0, 1), (1, -2)]

print(merge_sorted_arrays([[1, 4, 9], [2, 3, 10], [5, 6]]))       # [1, 2, 3, 4, 5, 6, 9, 10]
print(running_medians([6, 2, 9, 1]))                              # [6, 4.0, 6, 4.0]
