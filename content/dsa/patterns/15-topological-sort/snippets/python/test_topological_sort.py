"""Run from this folder:  python3 -m unittest discover -p "test_*.py" """
import unittest

from dfs_topo import topo_sort_dfs
from kahn import topo_sort_kahn
from kahn_levels import topo_levels


def respects(order, n, edges):
    pos = {v: i for i, v in enumerate(order)}
    return len(order) == n and len(pos) == n and all(pos[a] < pos[b] for a, b in edges)


class KahnTest(unittest.TestCase):
    def test_returns_an_order_where_every_edge_points_forward(self):
        edges = [(0, 2), (1, 2), (2, 3), (1, 4), (4, 3)]
        order = topo_sort_kahn(5, edges)
        self.assertEqual(order, [0, 1, 2, 4, 3])
        self.assertTrue(respects(order, 5, edges))

    def test_nodes_without_edges_still_appear(self):
        self.assertEqual(topo_sort_kahn(3, []), [0, 1, 2])
        self.assertEqual(topo_sort_kahn(4, [(3, 0)]), [1, 2, 3, 0])

    def test_a_cycle_a_self_loop_or_a_node_stuck_behind_a_cycle_gives_empty(self):
        self.assertEqual(topo_sort_kahn(3, [(0, 1), (1, 2), (2, 0)]), [])
        self.assertEqual(topo_sort_kahn(1, [(0, 0)]), [])
        self.assertEqual(topo_sort_kahn(4, [(0, 1), (1, 2), (2, 1), (2, 3)]), [])


class DfsTopoTest(unittest.TestCase):
    def test_reversed_finishing_order_respects_every_edge(self):
        edges = [(0, 2), (1, 2), (2, 3), (1, 4), (4, 3)]
        order = topo_sort_dfs(5, edges)
        self.assertEqual(order, [1, 4, 0, 2, 3])
        self.assertTrue(respects(order, 5, edges))

    def test_reaching_a_finished_black_node_is_not_a_cycle(self):
        edges = [(0, 1), (0, 2), (1, 3), (2, 3)]  # a diamond: 3 is reached twice
        self.assertTrue(respects(topo_sort_dfs(4, edges), 4, edges))
        self.assertEqual(topo_sort_dfs(2, []), [1, 0])

    def test_a_back_edge_to_a_gray_node_is_a_cycle(self):
        self.assertEqual(topo_sort_dfs(4, [(0, 1), (1, 2), (2, 3), (3, 1)]), [])
        self.assertEqual(topo_sort_dfs(1, [(0, 0)]), [])


class KahnLevelsTest(unittest.TestCase):
    def test_groups_nodes_into_rounds(self):
        self.assertEqual(topo_levels(5, [(0, 2), (1, 2), (2, 3), (1, 4), (4, 3)]), [[0, 1], [2, 4], [3]])
        self.assertEqual(topo_levels(3, []), [[0, 1, 2]])

    def test_a_node_waits_for_its_longest_chain_not_its_first_prerequisite(self):
        # 0 -> 3 directly, but also 0 -> 1 -> 2 -> 3, so 3 lands in round 4
        self.assertEqual(topo_levels(4, [(0, 3), (0, 1), (1, 2), (2, 3)]), [[0], [1], [2], [3]])

    def test_returns_none_when_a_cycle_blocks_some_nodes(self):
        self.assertIsNone(topo_levels(4, [(0, 1), (1, 2), (2, 1), (0, 3)]))


if __name__ == "__main__":
    unittest.main()
