import unittest

from answer_space import max_min_distance, ship_within_days


class AnswerSpaceTest(unittest.TestCase):
    def test_smallest_capacity_that_ships_within_the_deadline(self):
        self.assertEqual(ship_within_days([4, 2, 3, 1, 2], 3), 5)
        self.assertEqual(ship_within_days([4, 2, 3, 1, 2], 1), 12)
        self.assertEqual(ship_within_days([4, 2, 3, 1, 2], 5), 4)
        self.assertEqual(ship_within_days([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5), 15)

    def test_largest_minimum_gap_between_k_placed_items(self):
        self.assertEqual(max_min_distance([1, 2, 4, 8, 9], 3), 3)
        self.assertEqual(max_min_distance([9, 1, 8, 4, 2], 3), 3)
        self.assertEqual(max_min_distance([1, 2, 3, 4], 4), 1)
        self.assertEqual(max_min_distance([0, 100], 2), 100)


if __name__ == "__main__":
    unittest.main()
