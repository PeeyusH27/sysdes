import unittest

from classic import binary_search


class ClassicTest(unittest.TestCase):
    def test_finds_every_element_of_a_sorted_list(self):
        nums = [3, 8, 12, 17, 21, 30, 44, 52]
        for i, x in enumerate(nums):
            self.assertEqual(binary_search(nums, x), i)

    def test_returns_minus_one_for_missing_values_empty_and_one_element_lists(self):
        self.assertEqual(binary_search([3, 8, 12, 17, 21, 30, 44, 52], 10), -1)
        self.assertEqual(binary_search([3, 8, 12], 1), -1)
        self.assertEqual(binary_search([3, 8, 12], 99), -1)
        self.assertEqual(binary_search([], 5), -1)
        self.assertEqual(binary_search([5], 5), 0)
        self.assertEqual(binary_search([5], 4), -1)


if __name__ == "__main__":
    unittest.main()
