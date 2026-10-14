import unittest

from carry_down import good_nodes, root_to_leaf_paths
from trees import from_array


class TestCarryDown(unittest.TestCase):
    def test_good_nodes_carries_the_path_maximum_down(self):
        self.assertEqual(good_nodes(from_array([5, 3, 8, 6, 2, 7, 9])), 4)
        self.assertEqual(good_nodes(from_array([2, 2, 2])), 3)
        self.assertEqual(good_nodes(from_array([-1, -5, -3])), 1)
        self.assertEqual(good_nodes(None), 0)

    def test_root_to_leaf_paths_copies_the_path_at_each_leaf(self):
        self.assertEqual(root_to_leaf_paths(from_array([1, 2, 3, None, 5])), [[1, 2, 5], [1, 3]])
        self.assertEqual(root_to_leaf_paths(from_array([7])), [[7]])
        self.assertEqual(root_to_leaf_paths(None), [])


if __name__ == "__main__":
    unittest.main()
