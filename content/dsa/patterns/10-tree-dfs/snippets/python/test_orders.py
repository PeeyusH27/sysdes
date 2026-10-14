import unittest

from orders import Orders, traversals
from trees import from_array


class TestOrders(unittest.TestCase):
    def test_pre_in_and_post_order_of_a_small_bst(self):
        pre, inorder, post = traversals(from_array([8, 3, 10, 1, 6, None, 14]))
        self.assertEqual(pre, [8, 3, 1, 6, 10, 14])
        self.assertEqual(inorder, [1, 3, 6, 8, 10, 14])
        self.assertEqual(post, [1, 6, 3, 14, 10, 8])

    def test_empty_tree_and_single_node(self):
        self.assertEqual(traversals(None), Orders([], [], []))
        self.assertEqual(traversals(from_array([5])), Orders([5], [5], [5]))


if __name__ == "__main__":
    unittest.main()
