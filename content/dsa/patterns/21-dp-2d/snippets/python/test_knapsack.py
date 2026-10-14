import unittest

from knapsack import knapsack_01, knapsack_items, knapsack_unbounded


class KnapsackTest(unittest.TestCase):
    def test_01_uses_each_item_at_most_once(self):
        self.assertEqual(knapsack_01([2, 3], [3, 5], 6), 8)
        self.assertEqual(knapsack_01([2, 3, 4], [3, 4, 6], 5), 7)
        self.assertEqual(knapsack_01([3, 2, 2], [5, 3, 3], 4), 6)  # best value per weight first would give 5
        self.assertEqual(knapsack_01([5], [10], 4), 0)
        self.assertEqual(knapsack_01([], [], 10), 0)

    def test_unbounded_may_reuse_items(self):
        self.assertEqual(knapsack_unbounded([2, 3], [3, 5], 6), 10)
        self.assertEqual(knapsack_unbounded([1, 3, 4], [15, 50, 60], 8), 130)  # 3 + 3 + 1 + 1: 50 + 50 + 15 + 15
        self.assertEqual(knapsack_unbounded([5], [10], 4), 0)

    def test_the_full_table_also_tells_you_which_items_were_taken(self):
        self.assertEqual(knapsack_items([2, 3, 4], [3, 4, 6], 5), {"best": 7, "items": [0, 1]})
        self.assertEqual(knapsack_items([3, 2, 2], [5, 3, 3], 4), {"best": 6, "items": [1, 2]})
        self.assertEqual(knapsack_items([5], [10], 4), {"best": 0, "items": []})


if __name__ == "__main__":
    unittest.main()
