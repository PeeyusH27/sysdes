import unittest

from global_best import longest_univalue_path
from trees import from_array


class TestGlobalBest(unittest.TestCase):
    def test_finds_a_path_that_bends_below_the_root(self):
        self.assertEqual(longest_univalue_path(from_array([1, 4, 5, 4, 4, 5])), 2)
        self.assertEqual(longest_univalue_path(from_array([2, 7, 2, 7, 7, None, 2])), 2)
        self.assertEqual(longest_univalue_path(from_array([3, 3, 3, 3, None, None, 3])), 4)

    def test_a_path_of_one_node_has_no_edges(self):
        self.assertEqual(longest_univalue_path(from_array([1, 2, 3])), 0)
        self.assertEqual(longest_univalue_path(None), 0)


if __name__ == "__main__":
    unittest.main()
