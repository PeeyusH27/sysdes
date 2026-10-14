"""Run from this folder:  python3 -m unittest discover -p "test_*.py" """
import sys
import unittest

from adjacency import build_adjacency, build_adjacency_map
from bfs import bfs_distances, grid_steps
from grid_dfs import count_regions, region_sizes
from multi_source_bfs import distance_to_nearest


class AdjacencyTest(unittest.TestCase):
    def test_undirected_edges_are_stored_both_ways(self):
        self.assertEqual(build_adjacency(4, [(0, 1), (1, 2), (0, 2)]), [[1, 2], [0, 2], [1, 0], []])

    def test_directed_edges_one_way_isolated_nodes_get_empty_lists(self):
        adj = build_adjacency(3, [(0, 1), (0, 2)], True)
        self.assertEqual(adj, [[1, 2], [], []])
        adj[1].append(9)
        self.assertEqual(adj[2], [])  # rows are independent lists

    def test_map_version_handles_string_labels_and_sinks(self):
        adj = build_adjacency_map([("a", "b"), ("b", "c")], True)
        self.assertEqual(list(adj.items()), [("a", ["b"]), ("b", ["c"]), ("c", [])])
        self.assertEqual(build_adjacency_map([("x", "y")])["y"], ["x"])
        self.assertEqual(len(build_adjacency_map([])), 0)


class BfsTest(unittest.TestCase):
    def test_distances_in_an_undirected_graph_minus_one_when_unreachable(self):
        adj = [[1, 2], [0, 3], [0, 3, 4], [1, 2, 5], [2, 5, 6], [3, 4], [4], []]
        self.assertEqual(bfs_distances(adj, 0), [0, 1, 1, 2, 2, 3, 3, -1])
        self.assertEqual(bfs_distances(adj, 7), [-1, -1, -1, -1, -1, -1, -1, 0])

    def test_directed_graphs_only_follow_edges_forwards(self):
        self.assertEqual(bfs_distances([[1], [2], [], [0]], 0), [0, 1, 2, -1])

    def test_fewest_moves_on_a_grid(self):
        maze = ["..#.", ".##.", "...."]
        self.assertEqual(grid_steps(maze, (0, 0), (0, 3)), 7)
        self.assertEqual(grid_steps(maze, (0, 0), (0, 0)), 0)
        self.assertEqual(grid_steps(maze, (0, 0), (0, 2)), -1)               # the target is a wall
        self.assertEqual(grid_steps([".#.", ".#."], (0, 0), (1, 2)), -1)     # walled off


LAND = [
    [1, 1, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
]


class GridDfsTest(unittest.TestCase):
    def test_counts_and_measures_regions_with_4_directional_moves(self):
        self.assertEqual(count_regions(LAND), 3)
        self.assertEqual(region_sizes(LAND), [3, 3, 3])
        self.assertEqual(count_regions([[1, 0], [0, 1]]), 2)  # diagonals don't connect

    def test_works_for_any_target_value_including_strings(self):
        self.assertEqual(count_regions([["#", ".", "#"], ["#", ".", "#"]], "."), 1)
        self.assertEqual(region_sizes([["a", "a", "b"], ["b", "a", "b"]], "b"), [2, 1])

    def test_empty_grids_no_matches_one_big_region(self):
        self.assertEqual(count_regions([]), 0)
        self.assertEqual(region_sizes([[0, 0], [0, 0]]), [])
        full = [[1] * 50 for _ in range(50)]
        old = sys.getrecursionlimit()
        sys.setrecursionlimit(10_000)  # the recursive DFS can go 2500 cells deep here
        try:
            self.assertEqual(count_regions(full), 1)
        finally:
            sys.setrecursionlimit(old)
        self.assertEqual(region_sizes(full), [2500])

    def test_the_iterative_version_survives_a_region_too_deep_for_recursion(self):
        big = [[1] * 400 for _ in range(400)]
        self.assertEqual(region_sizes(big), [160000])


class MultiSourceBfsTest(unittest.TestCase):
    def test_every_open_cell_gets_the_distance_to_its_nearest_exit(self):
        self.assertEqual(distance_to_nearest(["E..#.", ".#...", ".#.#E", "....."]), [
            [0, 1, 2, -1, 2],
            [1, -1, 3, 2, 1],
            [2, -1, 4, -1, 0],
            [3, 4, 3, 2, 1],
        ])

    def test_walled_off_cells_and_walls_stay_minus_one(self):
        self.assertEqual(distance_to_nearest(["E..#.", ".#.#.", "...#."]), [
            [0, 1, 2, -1, -1],
            [1, -1, 3, -1, -1],
            [2, 3, 4, -1, -1],
        ])

    def test_no_exits_at_all(self):
        self.assertEqual(distance_to_nearest(["..", ".#"]), [[-1, -1], [-1, -1]])


if __name__ == "__main__":
    unittest.main()
