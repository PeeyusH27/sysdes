import unittest

from grid_paths import count_paths, count_paths_one_row

OPEN_3X3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
CENTRE_WALL = [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
FNS = [count_paths, count_paths_one_row]


class GridPathsTest(unittest.TestCase):
    def test_counts_right_down_paths_around_walls(self):
        for fn in FNS:
            self.assertEqual(fn(OPEN_3X3), 6)
            self.assertEqual(fn(CENTRE_WALL), 2)
            self.assertEqual(fn([[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]]), 3)

    def test_handles_single_cells_and_blocked_corners(self):
        for fn in FNS:
            self.assertEqual(fn([[0]]), 1)
            self.assertEqual(fn([[1]]), 0)
            self.assertEqual(fn([[1, 0], [0, 0]]), 0)  # the start is a wall
            self.assertEqual(fn([[0, 0], [0, 1]]), 0)  # the finish is a wall
            self.assertEqual(fn([[0, 0, 0, 0, 0]]), 1)


if __name__ == "__main__":
    unittest.main()
