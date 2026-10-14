import unittest

from complement import count_pairs


class ComplementTest(unittest.TestCase):
    def test_counts_index_pairs_that_hit_the_target(self):
        self.assertEqual(count_pairs([1, 5, 3, 3, 3, 7], 6), 4)  # (1, 5) and three ways to pick two 3s
        self.assertEqual(count_pairs([3, 4, 2], 6), 1)           # 3 can't pair with itself
        self.assertEqual(count_pairs([-2, 2, 0, 0], 0), 2)

    def test_returns_0_when_nothing_pairs_up(self):
        self.assertEqual(count_pairs([1, 2, 3], 10), 0)
        self.assertEqual(count_pairs([], 0), 0)
        self.assertEqual(count_pairs([5], 10), 0)


if __name__ == "__main__":
    unittest.main()
