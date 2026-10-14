import unittest
from math import comb

from combinations import combinations


class CombinationsTest(unittest.TestCase):
    def test_lists_every_k_combination_once_in_increasing_order(self):
        self.assertEqual(combinations(4, 2), [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]])
        self.assertEqual(combinations(3, 3), [[1, 2, 3]])
        self.assertEqual(combinations(3, 1), [[1], [2], [3]])

    def test_counts_match_n_choose_k(self):
        for n, k in [(5, 2), (6, 3), (8, 4), (7, 0)]:
            self.assertEqual(len(combinations(n, k)), comb(n, k))


if __name__ == "__main__":
    unittest.main()
