import unittest

from lists import from_array, to_array
from middle import end_of_first_half, middle_node


class TestMiddle(unittest.TestCase):
    def test_middle_node_returns_the_middle_or_the_second_middle_on_even_lengths(self):
        self.assertEqual(to_array(middle_node(from_array([1, 2, 3, 4, 5]))), [3, 4, 5])
        self.assertEqual(to_array(middle_node(from_array([1, 2, 3, 4, 5, 6]))), [4, 5, 6])
        self.assertEqual(to_array(middle_node(from_array([7]))), [7])
        self.assertEqual(to_array(middle_node(from_array([1, 2]))), [2])
        self.assertIsNone(middle_node(None))

    def test_end_of_first_half_stops_on_the_first_middle(self):
        self.assertEqual(end_of_first_half(from_array([1, 2, 3, 4, 5])).val, 3)
        self.assertEqual(end_of_first_half(from_array([1, 2, 3, 4, 5, 6])).val, 3)
        self.assertEqual(end_of_first_half(from_array([1, 2])).val, 1)
        self.assertEqual(end_of_first_half(from_array([9])).val, 9)


if __name__ == "__main__":
    unittest.main()
