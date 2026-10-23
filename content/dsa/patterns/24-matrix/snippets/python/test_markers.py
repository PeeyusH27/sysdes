import unittest

from markers import set_zeroes


class MarkersTest(unittest.TestCase):
    def test_a_zero_in_the_middle_clears_its_row_and_column(self):
        m = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
        set_zeroes(m)
        self.assertEqual(m, [[1, 0, 1], [0, 0, 0], [1, 0, 1]])

    def test_zeros_in_the_first_row_or_column_are_not_lost_or_invented(self):
        a = [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]
        set_zeroes(a)
        self.assertEqual(a, [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]])
        b = [[1, 2, 3], [0, 5, 6], [7, 8, 9]]
        set_zeroes(b)
        self.assertEqual(b, [[0, 2, 3], [0, 0, 0], [0, 8, 9]])

    def test_no_zeros_changes_nothing_and_single_lines_work(self):
        m = [[1, 2], [3, 4]]
        set_zeroes(m)
        self.assertEqual(m, [[1, 2], [3, 4]])
        row = [[1, 0, 3]]
        set_zeroes(row)
        self.assertEqual(row, [[0, 0, 0]])
        col = [[5], [0], [7]]
        set_zeroes(col)
        self.assertEqual(col, [[0], [0], [0]])


if __name__ == "__main__":
    unittest.main()
