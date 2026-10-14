import unittest

from coins import greedy_change, min_coins


class CoinsTest(unittest.TestCase):
    def test_greedy_is_optimal_for_canonical_coins(self):
        self.assertEqual(greedy_change([1, 5, 10, 25], 68), [25, 25, 10, 5, 1, 1, 1])
        for x in range(201):
            self.assertEqual(len(greedy_change([1, 5, 10, 25], x)), min_coins([1, 5, 10, 25], x))

    def test_greedy_fails_for_arbitrary_coins_dp_does_not(self):
        self.assertEqual(greedy_change([1, 3, 4], 6), [4, 1, 1])
        self.assertEqual(min_coins([1, 3, 4], 6), 2)
        self.assertIsNone(greedy_change([4, 3], 6))  # greedy gets stuck at 2 left, though 3 + 3 works
        self.assertEqual(min_coins([4, 3], 6), 2)
        self.assertEqual(min_coins([5], 3), -1)


if __name__ == "__main__":
    unittest.main()
