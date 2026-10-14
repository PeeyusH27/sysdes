import unittest

from cycle import cycle_start, has_cycle
from lists import from_array


class TestCycle(unittest.TestCase):
    def test_detects_cycles_of_every_shape(self):
        self.assertTrue(has_cycle(from_array([3, 8, 5, 1, 9, 4, 7], 2)))
        self.assertTrue(has_cycle(from_array([1], 0)))
        self.assertTrue(has_cycle(from_array([1, 2, 3, 4], 0)))
        self.assertFalse(has_cycle(from_array([1, 2, 3, 4])))
        self.assertFalse(has_cycle(from_array([5, 5, 5])))
        self.assertFalse(has_cycle(None))

    def test_finds_the_node_where_the_cycle_starts(self):
        cases = [([3, 8, 5, 1, 9, 4, 7], 2), ([1, 2], 0), ([1, 2, 3, 4, 5, 6], 5), ([1], 0),
                 ([10, 20, 30, 40, 50, 60, 70, 80, 90], 1)]
        for values, pos in cases:
            self.assertEqual(cycle_start(from_array(values, pos)).val, values[pos])
        self.assertIsNone(cycle_start(from_array([1, 2, 3])))
        self.assertIsNone(cycle_start(None))


if __name__ == "__main__":
    unittest.main()
