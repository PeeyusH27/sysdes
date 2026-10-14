import unittest

from opposite_ends import pair_sum


class OppositeEndsTest(unittest.TestCase):
    def test_finds_the_pair_in_a_sorted_list(self):
        self.assertEqual(pair_sum([1, 3, 4, 6, 8, 11], 10), [2, 3])
        self.assertEqual(pair_sum([-3, -1, 0, 2, 5], -4), [0, 1])

    def test_returns_minus_one_pair_when_no_pair_exists(self):
        self.assertEqual(pair_sum([2, 4, 5, 9], 12), [-1, -1])
        self.assertEqual(pair_sum([], 1), [-1, -1])


if __name__ == "__main__":
    unittest.main()
