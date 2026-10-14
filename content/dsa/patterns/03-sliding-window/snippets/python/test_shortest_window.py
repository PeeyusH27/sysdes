import unittest

from shortest_window import shortest_sum_at_least


class ShortestWindowTest(unittest.TestCase):
    def test_shortest_window_whose_sum_reaches_the_target(self):
        self.assertEqual(shortest_sum_at_least([3, 1, 4, 1, 5, 9], 12), 2)  # [5, 9]
        self.assertEqual(shortest_sum_at_least([1, 1, 1, 1], 3), 3)
        self.assertEqual(shortest_sum_at_least([10], 7), 1)

    def test_returns_0_when_nothing_reaches_the_target(self):
        self.assertEqual(shortest_sum_at_least([1, 2, 3], 7), 0)
        self.assertEqual(shortest_sum_at_least([], 1), 0)


if __name__ == "__main__":
    unittest.main()
