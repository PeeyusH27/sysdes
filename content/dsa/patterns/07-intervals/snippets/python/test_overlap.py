import unittest

from overlap import clashes, intersect, overlaps


class TestOverlap(unittest.TestCase):
    def test_closed_intervals_overlap_when_they_share_a_point(self):
        self.assertTrue(overlaps([1, 3], [2, 5]))
        self.assertTrue(overlaps([1, 3], [3, 5]))
        self.assertTrue(overlaps([1, 10], [4, 6]))
        self.assertFalse(overlaps([1, 2], [3, 4]))
        self.assertFalse(overlaps([5, 6], [1, 2]))

    def test_half_open_meetings_may_be_back_to_back(self):
        self.assertFalse(clashes([1, 3], [3, 5]))
        self.assertTrue(clashes([1, 4], [3, 5]))
        self.assertTrue(clashes([2, 3], [1, 9]))

    def test_intersection_is_the_later_start_to_the_earlier_end(self):
        self.assertEqual(intersect([0, 3], [2, 7]), [2, 3])
        self.assertEqual(intersect([1, 5], [5, 10]), [5, 5])
        self.assertIsNone(intersect([1, 2], [4, 6]))


if __name__ == "__main__":
    unittest.main()
