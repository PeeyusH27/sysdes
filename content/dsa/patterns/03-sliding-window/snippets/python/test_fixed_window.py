import unittest

from fixed_window import max_window_sum


class FixedWindowTest(unittest.TestCase):
    def test_finds_the_best_sum_of_k_consecutive_values(self):
        self.assertEqual(max_window_sum([2, 1, 5, 1, 3, 2], 3), 9)
        self.assertEqual(max_window_sum([-1, 4, -2, 3, -5], 2), 3)
        self.assertEqual(max_window_sum([-3, -1, -2], 1), -1)

    def test_handles_k_equal_to_the_length_and_invalid_k(self):
        self.assertEqual(max_window_sum([1, 2, 3], 3), 6)
        self.assertIsNone(max_window_sum([1, 2], 3))
        self.assertIsNone(max_window_sum([], 1))


if __name__ == "__main__":
    unittest.main()
