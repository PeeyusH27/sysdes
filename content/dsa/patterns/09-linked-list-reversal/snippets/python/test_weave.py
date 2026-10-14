import unittest

from lists import from_array, to_array
from weave import fold, weave


class TestWeave(unittest.TestCase):
    def test_weave_alternates_nodes_and_keeps_leftovers(self):
        self.assertEqual(to_array(weave(from_array([1, 2, 3]), from_array([6, 5, 4]))), [1, 6, 2, 5, 3, 4])
        self.assertEqual(to_array(weave(from_array([1, 2, 3]), from_array([9]))), [1, 9, 2, 3])
        self.assertEqual(to_array(weave(from_array([1]), from_array([7, 8, 9]))), [1, 7, 8, 9])
        self.assertEqual(to_array(weave(from_array([1, 2]), None)), [1, 2])

    def test_fold_takes_from_the_front_and_the_back_in_turn(self):
        self.assertEqual(to_array(fold(from_array([1, 2, 3, 4, 5, 6]))), [1, 6, 2, 5, 3, 4])
        self.assertEqual(to_array(fold(from_array([1, 2, 3, 4, 5]))), [1, 5, 2, 4, 3])
        self.assertEqual(to_array(fold(from_array([1, 2]))), [1, 2])
        self.assertEqual(to_array(fold(from_array([1]))), [1])
        self.assertIsNone(fold(None))


if __name__ == "__main__":
    unittest.main()
