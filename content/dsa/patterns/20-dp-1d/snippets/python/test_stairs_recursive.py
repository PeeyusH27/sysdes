import unittest

from stairs_recursive import min_cost_recursive


class StairsRecursiveTest(unittest.TestCase):
    def test_plain_recursion_finds_the_cheapest_way_to_the_top(self):
        self.assertEqual(min_cost_recursive([1, 4, 2, 3, 1, 5, 2]), 6)
        self.assertEqual(min_cost_recursive([10, 15, 20]), 15)
        self.assertEqual(min_cost_recursive([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]), 6)

    def test_plain_recursion_handles_the_smallest_staircases(self):
        self.assertEqual(min_cost_recursive([10, 15]), 10)
        self.assertEqual(min_cost_recursive([5]), 0)
        self.assertEqual(min_cost_recursive([0, 0, 0, 0]), 0)


if __name__ == "__main__":
    unittest.main()
