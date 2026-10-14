import unittest

from rotated import find_min_index


class RotatedTest(unittest.TestCase):
    def test_finds_the_rotation_point_for_every_rotation(self):
        ordered = [2, 5, 8, 11, 14, 17, 20]
        for k in range(len(ordered)):
            rotated = ordered[k:] + ordered[:k]
            self.assertEqual(find_min_index(rotated), (len(ordered) - k) % len(ordered))

    def test_handles_one_and_two_elements(self):
        self.assertEqual(find_min_index([7]), 0)
        self.assertEqual(find_min_index([4, 1]), 1)
        self.assertEqual(find_min_index([1, 4]), 0)


if __name__ == "__main__":
    unittest.main()
