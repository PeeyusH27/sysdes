import math
import unittest

from bellman_ford import bellman_ford, has_negative_cycle


class BellmanFordTest(unittest.TestCase):
    def test_handles_a_negative_edge_that_fools_dijkstra(self):
        self.assertEqual(bellman_ford(3, [[0, 1, 2], [0, 2, 5], [2, 1, -4]], 0), [0, 1, 5])
        self.assertEqual(bellman_ford(4, [[0, 1, 4], [0, 2, 5], [2, 1, -3], [1, 3, 2], [2, 3, 6]], 0), [0, 2, 5, 4])

    def test_limits_the_number_of_edges_when_asked(self):
        edges = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 2, 5], [0, 3, 9]]
        self.assertEqual(bellman_ford(4, edges, 0, 1), [0, 1, 5, 9])
        self.assertEqual(bellman_ford(4, edges, 0, 2), [0, 1, 2, 6])  # 0 -> 2 -> 3, not the 3-edge route
        self.assertEqual(bellman_ford(4, edges, 0), [0, 1, 2, 3])

    def test_unreachable_nodes_stay_at_infinity(self):
        self.assertEqual(bellman_ford(3, [[1, 2, 1]], 0), [0, math.inf, math.inf])

    def test_detects_a_reachable_negative_cycle(self):
        self.assertTrue(has_negative_cycle(3, [[0, 1, 1], [1, 2, -2], [2, 1, 1]], 0))
        self.assertFalse(has_negative_cycle(3, [[0, 1, 1], [1, 2, -2], [2, 1, 3]], 0))


if __name__ == "__main__":
    unittest.main()
