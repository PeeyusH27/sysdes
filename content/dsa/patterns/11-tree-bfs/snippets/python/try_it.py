import time

from trees import from_array  # @hide
from level_loop import level_maxes, level_values  # @hide
from first_match import shallowest_depth, is_leaf  # @hide
from array_queue import ArrayQueue  # @hide
# Edit the trees (level order, None = missing child) and press Run. The functions are the templates above.
root = from_array([8, 3, 10, 1, 6, None, 14, None, None, 4, 7])
print(level_values(root))                  # [[8], [3, 10], [1, 6, 14], [4, 7]]
print(level_maxes(root))                   # [8, 10, 14, 7]
print(shallowest_depth(root, is_leaf))     # 3 (leaves 1 and 14 are on level 3)

# pop(0) vs a head index on a 50,000-item queue. Double the length and watch pop(0) take about 4x as long.
items = list(range(50000))
t = time.perf_counter()
a = list(items)
while a:
    a.pop(0)
print("pop(0):", round((time.perf_counter() - t) * 1000), "ms")      # it grows quadratically
t = time.perf_counter()
q = ArrayQueue()
for x in items:
    q.push(x)
while q.size:
    q.shift()
print("head index:", round((time.perf_counter() - t) * 1000), "ms")  # a few ms at most
