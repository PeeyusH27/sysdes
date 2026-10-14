import unittest

from bst import range_sum, search_bst
from trees import from_array


def bst():
    return from_array([8, 3, 10, 1, 6, None, 14, None, None, 4, 7, 13])


class TestBst(unittest.TestCase):
    def test_range_sum_adds_only_values_inside_low_high(self):
        self.assertEqual(range_sum(bst(), 4, 10), 4 + 6 + 7 + 8 + 10)
        self.assertEqual(range_sum(bst(), 15, 20), 0)
        self.assertEqual(range_sum(None, 0, 5), 0)

    def test_search_bst_follows_one_branch(self):
        self.assertEqual(search_bst(bst(), 7).val, 7)
        self.assertEqual(search_bst(bst(), 13).val, 13)
        self.assertIsNone(search_bst(bst(), 5))


if __name__ == "__main__":
    unittest.main()
