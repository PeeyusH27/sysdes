import unittest

from dummy_head import merge_sorted, remove_all
from lists import from_array, to_array


class TestDummyHead(unittest.TestCase):
    def test_remove_all_handles_the_head_runs_and_the_tail(self):
        self.assertEqual(to_array(remove_all(from_array([6, 1, 6, 6, 2, 6]), 6)), [1, 2])
        self.assertEqual(to_array(remove_all(from_array([6, 6]), 6)), [])
        self.assertEqual(to_array(remove_all(from_array([1, 2, 3]), 9)), [1, 2, 3])
        self.assertIsNone(remove_all(None, 1))

    def test_merge_sorted_splices_two_sorted_lists(self):
        self.assertEqual(to_array(merge_sorted(from_array([1, 4, 9]), from_array([2, 3, 10]))), [1, 2, 3, 4, 9, 10])
        self.assertEqual(to_array(merge_sorted(None, from_array([0]))), [0])
        self.assertIsNone(merge_sorted(None, None))


if __name__ == "__main__":
    unittest.main()
