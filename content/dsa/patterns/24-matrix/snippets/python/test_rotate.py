import unittest

from rotate import rotate_clockwise, rotate_counter_clockwise, transpose


class RotateTest(unittest.TestCase):
    def test_transpose_flips_rows_and_columns_including_rectangles(self):
        self.assertEqual(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]])
        self.assertEqual(transpose([[7]]), [[7]])
        self.assertEqual(transpose([[1], [2], [3]]), [[1, 2, 3]])

    def test_rotate_clockwise_turns_the_grid_in_place(self):
        m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        rotate_clockwise(m)
        self.assertEqual(m, [[7, 4, 1], [8, 5, 2], [9, 6, 3]])
        one = [[5]]
        rotate_clockwise(one)
        self.assertEqual(one, [[5]])

    def test_counter_clockwise_undoes_clockwise_and_four_turns_return_the_start(self):
        m = [[1, 2], [3, 4]]
        rotate_counter_clockwise(m)
        self.assertEqual(m, [[2, 4], [1, 3]])
        rotate_clockwise(m)
        self.assertEqual(m, [[1, 2], [3, 4]])
        for _ in range(4):
            rotate_clockwise(m)
        self.assertEqual(m, [[1, 2], [3, 4]])


if __name__ == "__main__":
    unittest.main()
