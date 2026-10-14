import unittest

from over_amount import num_squares


class OverAmountTest(unittest.TestCase):
    def test_finds_the_fewest_squares_even_when_greedy_would_not(self):
        self.assertEqual(num_squares(12), 3)  # 4 + 4 + 4, while greedy takes 9 + 1 + 1 + 1
        self.assertEqual(num_squares(13), 2)  # 4 + 9
        self.assertEqual(num_squares(7), 4)   # 4 + 1 + 1 + 1

    def test_handles_perfect_squares_and_the_base_case(self):
        self.assertEqual(num_squares(0), 0)
        self.assertEqual(num_squares(1), 1)
        self.assertEqual(num_squares(49), 1)
        self.assertEqual(num_squares(9999), 4)  # 9999 leaves 7 when divided by 8: no three squares can make it


if __name__ == "__main__":
    unittest.main()
