import unittest

from lists import from_array, to_array
from reverse import reverse_list


class TestReverse(unittest.TestCase):
    def test_reverses_lists_of_every_length(self):
        self.assertEqual(to_array(reverse_list(from_array([1, 2, 3, 4, 5]))), [5, 4, 3, 2, 1])
        self.assertEqual(to_array(reverse_list(from_array([1, 2]))), [2, 1])
        self.assertEqual(to_array(reverse_list(from_array([7]))), [7])
        self.assertIsNone(reverse_list(None))

    def test_reuses_the_original_nodes(self):
        head = from_array([1, 2, 3])
        tail = head.next.next
        self.assertIs(reverse_list(head), tail)
        self.assertIsNone(head.next)


if __name__ == "__main__":
    unittest.main()
