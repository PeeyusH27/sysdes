import unittest

from diagonals import anti_diagonals, diagonal_order


class DiagonalsTest(unittest.TestCase):
    def test_anti_diagonals_groups_cells_by_row_plus_column(self):
        self.assertEqual(anti_diagonals([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), [[1], [2, 4], [3, 5, 7], [6, 8], [9]])
        self.assertEqual(anti_diagonals([[1, 2, 3], [4, 5, 6]]), [[1], [2, 4], [3, 5], [6]])

    def test_diagonal_order_zig_zags_starting_up_right(self):
        self.assertEqual(diagonal_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), [1, 2, 4, 7, 5, 3, 6, 8, 9])
        self.assertEqual(diagonal_order([[1, 2, 3], [4, 5, 6]]), [1, 2, 4, 5, 3, 6])
        self.assertEqual(diagonal_order([[1, 2], [3, 4], [5, 6]]), [1, 2, 3, 5, 4, 6])

    def test_single_row_single_column_and_single_cell(self):
        self.assertEqual(diagonal_order([[1, 2, 3, 4]]), [1, 2, 3, 4])
        self.assertEqual(diagonal_order([[1], [2], [3]]), [1, 2, 3])
        self.assertEqual(diagonal_order([[9]]), [9])


if __name__ == "__main__":
    unittest.main()
