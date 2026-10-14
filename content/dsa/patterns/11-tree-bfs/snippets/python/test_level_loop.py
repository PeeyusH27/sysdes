import unittest

from level_loop import level_maxes, level_values
from trees import from_array


class TestLevelLoop(unittest.TestCase):
    def test_level_maxes_keeps_one_value_per_level(self):
        self.assertEqual(level_maxes(from_array([1, 3, 2, 5, 3, None, 9])), [1, 3, 9])
        self.assertEqual(level_maxes(from_array([-4, -7, -2])), [-4, -2])
        self.assertEqual(level_maxes(from_array([1, 2, None, 3])), [1, 2, 3])
        self.assertEqual(level_maxes(None), [])

    def test_level_values_groups_values_level_by_level_left_to_right(self):
        self.assertEqual(level_values(from_array([8, 3, 10, 1, 6, None, 14, None, None, 4, 7])), [[8], [3, 10], [1, 6, 14], [4, 7]])
        self.assertEqual(level_values(from_array([5])), [[5]])
        self.assertEqual(level_values(None), [])


if __name__ == "__main__":
    unittest.main()
