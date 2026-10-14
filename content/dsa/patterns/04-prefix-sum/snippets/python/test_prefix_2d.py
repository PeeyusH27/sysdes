import unittest

from prefix_2d import build_prefix_2d, rect_sum

GRID = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]


class Prefix2DTest(unittest.TestCase):
    def test_builds_the_padded_2d_prefix_table(self):
        self.assertEqual(build_prefix_2d(GRID), [
            [0, 0, 0, 0],
            [0, 1, 3, 6],
            [0, 5, 12, 21],
            [0, 12, 27, 45],
        ])
        self.assertEqual(build_prefix_2d([]), [[0]])

    def test_answers_rectangle_sums_in_o1(self):
        P = build_prefix_2d(GRID)
        self.assertEqual(rect_sum(P, 1, 1, 2, 2), 28)  # 5 + 6 + 8 + 9
        self.assertEqual(rect_sum(P, 0, 0, 2, 2), 45)
        self.assertEqual(rect_sum(P, 2, 0, 2, 0), 7)
        self.assertEqual(rect_sum(P, 0, 1, 1, 2), 16)  # 2 + 3 + 5 + 6


if __name__ == "__main__":
    unittest.main()
