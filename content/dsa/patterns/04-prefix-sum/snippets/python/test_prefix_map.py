import unittest

from prefix_map import longest_subarray_with_sum


class PrefixMapTest(unittest.TestCase):
    def test_longest_subarray_with_sum_k_negatives_allowed(self):
        self.assertEqual(longest_subarray_with_sum([2, -1, 3, -2, 1, 4], 3), 5)  # [2, -1, 3, -2, 1]
        self.assertEqual(longest_subarray_with_sum([0, 3, 0, 0], 3), 4)
        self.assertEqual(longest_subarray_with_sum([-1, -1, 1, 1], 0), 4)

    def test_returns_0_when_no_subarray_sums_to_k(self):
        self.assertEqual(longest_subarray_with_sum([1, 2, 4], 5), 0)
        self.assertEqual(longest_subarray_with_sum([], 0), 0)


if __name__ == "__main__":
    unittest.main()
