import unittest

from iterative import inorder_iterative, postorder_iterative, preorder_iterative
from orders import traversals
from trees import from_array

SHAPES = [
    [8, 3, 10, 1, 6, None, 14, None, None, 4, 7, 13],
    [1, 2, None, 3, None, 4],
    [1, None, 2, None, 3],
    [5],
    [],
]


class TestIterative(unittest.TestCase):
    def test_iterative_orders_match_the_recursive_ones(self):
        for shape in SHAPES:
            expected = traversals(from_array(shape))
            self.assertEqual(preorder_iterative(from_array(shape)), expected.pre)
            self.assertEqual(inorder_iterative(from_array(shape)), expected.inorder)
            self.assertEqual(postorder_iterative(from_array(shape)), expected.post)

    def test_in_order_of_a_bst_is_sorted(self):
        self.assertEqual(inorder_iterative(from_array([6, 3, 9, 1, 4, 8, 10])), [1, 3, 4, 6, 8, 9, 10])


if __name__ == "__main__":
    unittest.main()
