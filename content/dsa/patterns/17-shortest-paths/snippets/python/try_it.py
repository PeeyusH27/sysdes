from min_heap import MinHeap  # @hide
from bfs_distances import bfs_distances  # @hide
from dijkstra import dijkstra, shortest_path  # @hide
from bellman_ford import bellman_ford  # @hide
# Edit the graphs and press Run. The functions are the templates above.
print(bfs_distances(5, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]], 0))  # [0, 1, 1, 2, 3]

roads = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]]
print(dijkstra(5, roads, 0))                # [0, 3, 1, 4, 7]
print(shortest_path(5, roads, 0, 4))        # {'dist': 7, 'path': [0, 2, 1, 3, 4]}

# A negative edge: node 1 is popped at distance 2 before 0 -> 2 -> 1 (cost 1) is found.
tricky = [[0, 1, 2], [0, 2, 5], [2, 1, -4]]
print(shortest_path(3, tricky, 0, 1)["dist"])  # 2 (wrong)
print(bellman_ford(3, tricky, 0))           # [0, 1, 5]

# At most 2 edges: the 3-edge route to node 3 is not allowed.
flights = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 2, 5], [0, 3, 9]]
print(bellman_ford(4, flights, 0, 2))       # [0, 1, 2, 6]

heap = MinHeap()
for pair in [[5, "e"], [1, "a"], [3, "c"]]:
    heap.push(pair)
print(heap.pop(), heap.pop())               # [1, 'a'] [3, 'c']
