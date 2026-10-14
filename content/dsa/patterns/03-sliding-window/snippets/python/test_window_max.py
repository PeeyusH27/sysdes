import unittest

from window_max import window_max


class WindowMaxTest(unittest.TestCase):
    def test_maximum_of_every_window_of_size_k(self):
        self.assertEqual(window_max([5, 3, 4, 1, 6, 2, 2], 3), [5, 4, 6, 6, 6])
        self.assertEqual(window_max([9, 7, 5, 3, 1], 3), [9, 7, 5])
        self.assertEqual(window_max([1, 2, 3, 4], 2), [2, 3, 4])

    def test_k_1_and_k_n(self):
        self.assertEqual(window_max([4, -1, 2], 1), [4, -1, 2])
        self.assertEqual(window_max([4, -1, 2], 3), [4])
        self.assertEqual(window_max([], 2), [])


if __name__ == "__main__":
    unittest.main()
