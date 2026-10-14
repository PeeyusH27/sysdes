import unittest

from stairs_recursive import min_cost_recursive
from stairs_table import min_cost_table


class StairsTableTest(unittest.TestCase):
    def test_bottom_up_table_matches_the_known_answers(self):
        self.assertEqual(min_cost_table([1, 4, 2, 3, 1, 5, 2]), 6)
        self.assertEqual(min_cost_table([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]), 6)
        self.assertEqual(min_cost_table([10, 15]), 10)
        self.assertEqual(min_cost_table([5]), 0)

    def test_bottom_up_table_agrees_with_plain_recursion_on_small_inputs(self):
        for n in range(1, 15):
            cost = [(i * 37 + n * 11) % 9 for i in range(n)]
            self.assertEqual(min_cost_table(cost), min_cost_recursive(cost))


if __name__ == "__main__":
    unittest.main()
