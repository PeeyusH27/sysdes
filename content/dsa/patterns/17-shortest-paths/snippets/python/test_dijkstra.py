import math
import unittest

from dijkstra import dijkstra, shortest_path

ROADS = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]]


class DijkstraTest(unittest.TestCase):
    def test_finds_the_shortest_distance_to_every_node(self):
        self.assertEqual(dijkstra(5, ROADS, 0), [0, 3, 1, 4, 7])
        self.assertEqual(dijkstra(3, [[0, 1, 0], [1, 2, 0]], 0), [0, 0, 0])  # zero weights are fine

    def test_unreachable_nodes_stay_at_infinity(self):
        self.assertEqual(dijkstra(3, [[1, 0, 5]], 0), [0, math.inf, math.inf])
        self.assertEqual(dijkstra(1, [], 0), [0])

    def test_rebuilds_the_path_from_prev_pointers(self):
        self.assertEqual(shortest_path(5, ROADS, 0, 4), {"dist": 7, "path": [0, 2, 1, 3, 4]})
        self.assertEqual(shortest_path(5, ROADS, 0, 0), {"dist": 0, "path": [0]})
        self.assertEqual(shortest_path(3, [[0, 1, 1]], 0, 2), {"dist": -1, "path": []})

    def test_stopping_at_the_target_goes_wrong_with_a_negative_edge(self):
        # 0 -> 2 -> 1 costs 5 - 4 = 1, but 1 is popped (and returned) at distance 2 first.
        self.assertEqual(shortest_path(3, [[0, 1, 2], [0, 2, 5], [2, 1, -4]], 0, 1), {"dist": 2, "path": [0, 1]})


if __name__ == "__main__":
    unittest.main()
