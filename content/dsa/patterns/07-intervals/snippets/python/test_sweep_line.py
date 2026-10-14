import unittest

from sweep_line import max_overlap


class TestSweepLine(unittest.TestCase):
    def test_counts_the_most_intervals_open_at_once(self):
        self.assertEqual(max_overlap([[1, 5], [2, 6], [4, 8], [6, 9], [8, 10]]), 3)
        self.assertEqual(max_overlap([[1, 10], [2, 9], [3, 8]]), 3)
        self.assertEqual(max_overlap([]), 0)

    def test_back_to_back_intervals_do_not_overlap(self):
        self.assertEqual(max_overlap([[1, 3], [3, 5], [5, 7]]), 1)
        self.assertEqual(max_overlap([[3, 5], [1, 3]]), 1)


if __name__ == "__main__":
    unittest.main()
