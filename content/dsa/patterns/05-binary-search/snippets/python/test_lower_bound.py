import unittest

from lower_bound import count_in_range, first_true, lower_bound, upper_bound

NUMS = [1, 3, 3, 3, 5, 8, 9]


class LowerBoundTest(unittest.TestCase):
    def test_lower_and_upper_bound_bracket_every_copy_of_a_value(self):
        self.assertEqual(lower_bound(NUMS, 3), 1)
        self.assertEqual(upper_bound(NUMS, 3), 4)
        self.assertEqual(lower_bound(NUMS, 4), 4)   # missing: insert position
        self.assertEqual(upper_bound(NUMS, 4), 4)
        self.assertEqual(lower_bound(NUMS, 0), 0)
        self.assertEqual(lower_bound(NUMS, 10), len(NUMS))
        self.assertEqual(lower_bound([], 1), 0)

    def test_first_true_works_on_any_monotonic_predicate_including_over_values(self):
        self.assertEqual(first_true(0, 100, lambda x: x * x >= 50), 8)
        self.assertEqual(first_true(0, 5, lambda _: False), 5)
        self.assertEqual(first_true(0, 5, lambda _: True), 0)

    def test_count_in_range_uses_two_bounds(self):
        self.assertEqual(count_in_range(NUMS, 3, 5), 4)
        self.assertEqual(count_in_range(NUMS, 6, 7), 0)
        self.assertEqual(count_in_range(NUMS, 0, 100), 7)
        self.assertEqual(count_in_range(NUMS, 5, 2), 0)


if __name__ == "__main__":
    unittest.main()
