import unittest

from grid_paths import count_paths


class GridPathsTest(unittest.TestCase):
    def test_counts_simple_paths_around_walls(self):
        self.assertEqual(count_paths([[0, 0], [0, 0]]), 2)
        self.assertEqual(count_paths([[0, 0, 0], [0, 1, 0], [0, 0, 0]]), 2)
        self.assertEqual(count_paths([[0, 0, 0], [0, 0, 0], [0, 0, 0]]), 12)
        self.assertEqual(count_paths([[0, 1], [0, 0]]), 1)

    def test_edge_cases_one_cell_blocked_start_no_way_through(self):
        self.assertEqual(count_paths([[0]]), 1)
        self.assertEqual(count_paths([[1, 0], [0, 0]]), 0)
        self.assertEqual(count_paths([[0, 1], [1, 0]]), 0)

    def test_leaves_the_grid_exactly_as_it_found_it(self):
        grid = [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]]
        copy = [row[:] for row in grid]
        count_paths(grid)
        self.assertEqual(grid, copy)


if __name__ == "__main__":
    unittest.main()
