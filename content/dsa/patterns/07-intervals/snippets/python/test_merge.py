import unittest

from merge import covered_length, merge_intervals


class TestMerge(unittest.TestCase):
    def test_merges_overlapping_touching_and_nested_intervals(self):
        self.assertEqual(merge_intervals([[7, 8], [2, 4], [10, 11], [1, 3], [4, 5]]), [[1, 5], [7, 8], [10, 11]])
        self.assertEqual(merge_intervals([[4, 8], [1, 10], [10, 11], [2, 3]]), [[1, 11]])
        self.assertEqual(merge_intervals([[1, 2], [3, 4]]), [[1, 2], [3, 4]])
        self.assertEqual(merge_intervals([]), [])

    def test_does_not_reorder_the_callers_list(self):
        data = [[5, 6], [1, 2]]
        merge_intervals(data)
        self.assertEqual(data, [[5, 6], [1, 2]])

    def test_covered_length_counts_shared_parts_once(self):
        self.assertEqual(covered_length([[1, 4], [2, 6], [8, 9]]), 6)
        self.assertEqual(covered_length([[0, 10], [2, 3]]), 10)
        self.assertEqual(covered_length([]), 0)


if __name__ == "__main__":
    unittest.main()
