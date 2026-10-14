import unittest

from stairs_rolling import min_cost_rolling
from stairs_table import min_cost_table


class StairsRollingTest(unittest.TestCase):
    def test_rolling_variables_match_the_known_answers(self):
        self.assertEqual(min_cost_rolling([1, 4, 2, 3, 1, 5, 2]), 6)
        self.assertEqual(min_cost_rolling([10, 15, 20]), 15)
        self.assertEqual(min_cost_rolling([10, 15]), 10)
        self.assertEqual(min_cost_rolling([5]), 0)

    def test_rolling_variables_agree_with_the_full_table_on_a_long_staircase(self):
        cost = [(i * 7919) % 100 for i in range(50000)]
        self.assertEqual(min_cost_rolling(cost), min_cost_table(cost))


if __name__ == "__main__":
    unittest.main()
