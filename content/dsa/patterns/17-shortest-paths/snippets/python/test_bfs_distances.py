import unittest

from bfs_distances import bfs_distances


class BfsDistancesTest(unittest.TestCase):
    def test_distances_are_edge_counts_from_the_source(self):
        self.assertEqual(bfs_distances(5, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]], 0), [0, 1, 1, 2, 3])
        self.assertEqual(bfs_distances(4, [[0, 1], [1, 2], [2, 3], [3, 0]], 1), [1, 0, 1, 2])

    def test_unreachable_nodes_stay_minus_one(self):
        self.assertEqual(bfs_distances(4, [[0, 1]], 0), [0, 1, -1, -1])
        self.assertEqual(bfs_distances(1, [], 0), [0])


if __name__ == "__main__":
    unittest.main()
