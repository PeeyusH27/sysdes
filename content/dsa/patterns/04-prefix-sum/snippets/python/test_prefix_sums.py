import unittest

from prefix_sums import build_prefix, range_sum


class PrefixSumsTest(unittest.TestCase):
    def test_builds_running_sums_with_a_leading_0(self):
        self.assertEqual(build_prefix([3, 1, 4, 1, 5]), [0, 3, 4, 8, 9, 14])
        self.assertEqual(build_prefix([]), [0])

    def test_answers_inclusive_range_sums(self):
        p = build_prefix([3, 1, 4, 1, 5])
        self.assertEqual(range_sum(p, 1, 3), 6)
        self.assertEqual(range_sum(p, 0, 4), 14)
        self.assertEqual(range_sum(p, 2, 2), 4)
        self.assertEqual(range_sum(build_prefix([-2, 5, -1]), 0, 1), 3)


if __name__ == "__main__":
    unittest.main()
