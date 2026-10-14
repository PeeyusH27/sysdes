import unittest

from read_write import remove_duplicates


class ReadWriteTest(unittest.TestCase):
    def test_compacts_a_sorted_list_in_place(self):
        nums = [1, 1, 2, 3, 3, 3, 4]
        k = remove_duplicates(nums)
        self.assertEqual(k, 4)
        self.assertEqual(nums[:k], [1, 2, 3, 4])

    def test_handles_empty_and_all_equal_input(self):
        self.assertEqual(remove_duplicates([]), 0)
        same = [7, 7, 7]
        self.assertEqual(remove_duplicates(same), 1)
        self.assertEqual(same[0], 7)


if __name__ == "__main__":
    unittest.main()
