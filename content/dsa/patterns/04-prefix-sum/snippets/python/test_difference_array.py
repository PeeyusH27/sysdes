import unittest

from difference_array import apply_range_adds


class DifferenceArrayTest(unittest.TestCase):
    def test_applies_many_range_additions_with_one_final_pass(self):
        self.assertEqual(apply_range_adds(6, [[1, 3, 2], [2, 5, 3], [0, 1, -1]]), [-1, 1, 5, 5, 3, 3])
        self.assertEqual(apply_range_adds(4, [[0, 3, 1], [0, 3, 1]]), [2, 2, 2, 2])

    def test_single_cells_and_no_updates(self):
        self.assertEqual(apply_range_adds(3, [[2, 2, 5]]), [0, 0, 5])
        self.assertEqual(apply_range_adds(3, []), [0, 0, 0])


if __name__ == "__main__":
    unittest.main()
