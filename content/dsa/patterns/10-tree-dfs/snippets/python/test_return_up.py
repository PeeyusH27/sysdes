import unittest

from return_up import height, is_balanced
from trees import from_array


class TestReturnUp(unittest.TestCase):
    def test_height_counts_nodes_on_the_longest_root_to_leaf_path(self):
        self.assertEqual(height(from_array([8, 3, 10, 1, 6, None, 14, None, None, 4, 7])), 4)
        self.assertEqual(height(from_array([1, 2, None, 3, None, 4])), 4)
        self.assertEqual(height(from_array([5])), 1)
        self.assertEqual(height(None), 0)

    def test_is_balanced_compares_subtree_heights_at_every_node(self):
        self.assertTrue(is_balanced(from_array([8, 3, 10, 1, 6, None, 14])))
        self.assertFalse(is_balanced(from_array([1, 2, None, 3])))
        self.assertFalse(is_balanced(from_array([1, 2, 2, 3, None, None, 3, 4, None, None, 4])))
        self.assertTrue(is_balanced(None))


if __name__ == "__main__":
    unittest.main()
