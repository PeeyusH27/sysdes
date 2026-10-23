import unittest

from sorted_matrix import search_flat, search_staircase

CHAINED = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]]


class SortedMatrixTest(unittest.TestCase):
    def test_search_flat_treats_the_grid_as_one_sorted_list(self):
        for v in [x for row in CHAINED for x in row]:
            self.assertTrue(search_flat(CHAINED, v))
        for v in (0, 2, 13, 61):
            self.assertFalse(search_flat(CHAINED, v))
        self.assertTrue(search_flat([[4]], 4))
        self.assertFalse(search_flat([[4]], 5))

    def test_search_staircase_works_when_only_rows_and_columns_are_sorted(self):
        grid = [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]]
        for v in [x for row in grid for x in row]:
            self.assertTrue(search_staircase(grid, v))
        for v in (0, 15, 18, 20):
            self.assertFalse(search_staircase(grid, v))

    def test_both_agree_on_a_chained_grid(self):
        for v in range(63):
            self.assertEqual(search_staircase(CHAINED, v), search_flat(CHAINED, v))


if __name__ == "__main__":
    unittest.main()
