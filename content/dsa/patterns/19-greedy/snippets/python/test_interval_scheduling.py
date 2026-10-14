import unittest

from interval_scheduling import max_non_overlapping


class IntervalSchedulingTest(unittest.TestCase):
    def test_keeps_the_most_activities(self):
        self.assertEqual(max_non_overlapping([[5, 9], [1, 3], [6, 8], [2, 5], [8, 10], [4, 6]]), 4)
        self.assertEqual(max_non_overlapping([[1, 100], [2, 3], [4, 5], [6, 7]]), 3)
        self.assertEqual(max_non_overlapping([[1, 5], [4, 7], [6, 10]]), 2)

    def test_touching_is_fine_identical_intervals_keep_one(self):
        self.assertEqual(max_non_overlapping([[1, 2], [2, 3], [3, 4]]), 3)
        self.assertEqual(max_non_overlapping([[4, 6], [4, 6], [4, 6]]), 1)
        self.assertEqual(max_non_overlapping([]), 0)


if __name__ == "__main__":
    unittest.main()
