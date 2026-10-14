from adjacency import build_adjacency  # @hide
from bfs import bfs_distances, grid_steps  # @hide
from grid_dfs import count_regions, region_sizes  # @hide
from multi_source_bfs import distance_to_nearest  # @hide
# Edit the inputs and press Run. The functions are the templates above.
adj = build_adjacency(6, [(0, 1), (0, 2), (1, 3), (2, 3), (4, 5)])
print(adj)                         # [[1, 2], [0, 3], [0, 3], [1, 2], [5], [4]]
print(bfs_distances(adj, 0))       # [0, 1, 1, 2, -1, -1]: 4 and 5 are unreachable

land = [
    [1, 1, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [0, 0, 1, 0, 1],
]
print(count_regions(land), region_sizes(land))  # 3 [3, 4, 1]

maze = ["..#.", ".##.", "...."]
print(grid_steps(maze, (0, 0), (0, 3)))         # 7

print(distance_to_nearest(["E..", ".#.", "..E"]))  # [[0, 1, 2], [1, -1, 1], [2, 1, 0]]
