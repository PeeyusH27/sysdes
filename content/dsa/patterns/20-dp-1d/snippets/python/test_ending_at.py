import unittest

from ending_at import max_sum_increasing


class EndingAtTest(unittest.TestCase):
    def test_picks_the_increasing_subsequence_with_the_largest_sum(self):
        self.assertEqual(max_sum_increasing([4, 6, 1, 3, 8, 4, 6]), 18)  # 4 + 6 + 8
        self.assertEqual(max_sum_increasing([1, 101, 2, 3, 100]), 106)   # 1 + 2 + 3 + 100
        self.assertEqual(max_sum_increasing([10, 5, 4, 3]), 10)

    def test_handles_empty_equal_and_negative_values(self):
        self.assertEqual(max_sum_increasing([]), 0)
        self.assertEqual(max_sum_increasing([7, 7, 7]), 7)  # strictly increasing: equal values can't chain
        self.assertEqual(max_sum_increasing([-3, -1, -2]), -1)


if __name__ == "__main__":
    unittest.main()
