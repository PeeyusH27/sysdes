from kahn import topo_sort_kahn  # @hide
from dfs_topo import topo_sort_dfs  # @hide
from kahn_levels import topo_levels  # @hide
# Edges are (from, to): "from must come before to". Edit them and press Run.
edges = [(0, 2), (1, 2), (2, 3), (1, 4), (4, 3)]
print(topo_sort_kahn(5, edges))  # [0, 1, 2, 4, 3]
print(topo_sort_dfs(5, edges))   # [1, 4, 0, 2, 3]: a different order, just as valid
print(topo_levels(5, edges))     # [[0, 1], [2, 4], [3]]: three rounds

loop = [(0, 1), (1, 2), (2, 0)]
print(topo_sort_kahn(3, loop), topo_sort_dfs(3, loop), topo_levels(3, loop))  # [] [] None
