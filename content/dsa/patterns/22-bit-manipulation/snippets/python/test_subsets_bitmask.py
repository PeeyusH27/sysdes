import unittest

from subsets_bitmask import submasks, subsets


class SubsetsBitmaskTest(unittest.TestCase):
    def test_lists_all_2_to_the_n_subsets_in_mask_order(self):
        self.assertEqual(
            subsets(["a", "b", "c"]),
            [[], ["a"], ["b"], ["a", "b"], ["c"], ["a", "c"], ["b", "c"], ["a", "b", "c"]],
        )
        self.assertEqual(subsets([]), [[]])
        self.assertEqual(len(subsets([1, 2, 3, 4, 5])), 32)

    def test_enumerates_the_submasks_of_a_mask(self):
        self.assertEqual(submasks(0b1011), [0b1011, 0b1010, 0b1001, 0b1000, 0b0011, 0b0010, 0b0001, 0])
        self.assertEqual(submasks(0), [0])


if __name__ == "__main__":
    unittest.main()
