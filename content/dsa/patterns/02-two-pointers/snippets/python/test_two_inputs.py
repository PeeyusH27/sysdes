import unittest

from two_inputs import merge_sorted, sorted_squares


class TwoInputsTest(unittest.TestCase):
    def test_squares_of_a_sorted_list_stay_sorted(self):
        self.assertEqual(sorted_squares([-4, -1, 0, 3, 10]), [0, 1, 9, 16, 100])
        self.assertEqual(sorted_squares([-7, -3, 2, 3, 11]), [4, 9, 9, 49, 121])

    def test_merges_two_sorted_lists(self):
        self.assertEqual(merge_sorted([1, 4, 9], [2, 3, 10, 12]), [1, 2, 3, 4, 9, 10, 12])
        self.assertEqual(merge_sorted([], [5]), [5])


if __name__ == "__main__":
    unittest.main()
