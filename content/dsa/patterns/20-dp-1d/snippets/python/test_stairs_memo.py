import sys
import unittest

from stairs_memo import min_cost_memo


class StairsMemoTest(unittest.TestCase):
    def test_memoized_recursion_matches_the_known_answers(self):
        self.assertEqual(min_cost_memo([1, 4, 2, 3, 1, 5, 2]), 6)
        self.assertEqual(min_cost_memo([10, 15, 20]), 15)
        self.assertEqual(min_cost_memo([10, 15]), 10)
        self.assertEqual(min_cost_memo([5]), 0)

    def test_memoized_recursion_stays_fast_on_a_long_staircase(self):
        cost = [(i * 7) % 10 for i in range(2000)]
        a = b = 0
        for i in range(2, len(cost) + 1):
            a, b = b, min(b + cost[i - 1], a + cost[i - 2])
        old = sys.getrecursionlimit()
        sys.setrecursionlimit(10000)  # the memo recursion is 2000 deep; CPython's default limit is 1000
        try:
            self.assertEqual(min_cost_memo(cost), b)
        finally:
            sys.setrecursionlimit(old)


if __name__ == "__main__":
    unittest.main()
