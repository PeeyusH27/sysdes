import unittest

from first_match import is_leaf, shallowest_depth
from trees import from_array


class TestFirstMatch(unittest.TestCase):
    def test_the_first_leaf_bfs_meets_is_the_shallowest_leaf(self):
        self.assertEqual(shallowest_depth(from_array([1, 2, 3, 4, 5, None, None, 6, 7]), is_leaf), 2)
        self.assertEqual(shallowest_depth(from_array([1, None, 2, None, 3]), is_leaf), 3)
        self.assertEqual(shallowest_depth(from_array([1]), is_leaf), 1)

    def test_any_predicate_works_and_no_match_gives_minus_one(self):
        root = from_array([5, 8, 2, 1, 9, 9])
        self.assertEqual(shallowest_depth(root, lambda n: n.val == 9), 3)
        self.assertEqual(shallowest_depth(root, lambda n: n.val > 100), -1)
        self.assertEqual(shallowest_depth(None, is_leaf), -1)


if __name__ == "__main__":
    unittest.main()
