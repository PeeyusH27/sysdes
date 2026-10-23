import unittest

from spiral import spiral_fill, spiral_order


class SpiralTest(unittest.TestCase):
    def test_spiral_order_reads_a_square_grid_clockwise(self):
        self.assertEqual(spiral_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), [1, 2, 3, 6, 9, 8, 7, 4, 5])

    def test_spiral_order_handles_wide_tall_and_single_line_grids_without_repeats(self):
        self.assertEqual(spiral_order([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]), [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7])
        self.assertEqual(spiral_order([[1, 2], [3, 4], [5, 6]]), [1, 2, 4, 6, 5, 3])
        self.assertEqual(spiral_order([[1, 2, 3]]), [1, 2, 3])
        self.assertEqual(spiral_order([[1], [2], [3]]), [1, 2, 3])

    def test_spiral_fill_writes_1_to_n_squared_along_the_spiral_and_spiral_order_reads_it_back(self):
        self.assertEqual(spiral_fill(3), [[1, 2, 3], [8, 9, 4], [7, 6, 5]])
        self.assertEqual(spiral_fill(1), [[1]])
        for n in (2, 4, 5):
            self.assertEqual(spiral_order(spiral_fill(n)), list(range(1, n * n + 1)))


if __name__ == "__main__":
    unittest.main()
