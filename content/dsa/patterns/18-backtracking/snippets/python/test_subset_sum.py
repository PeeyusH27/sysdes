import unittest

from subset_sum import subsets_with_sum


class SubsetSumTest(unittest.TestCase):
    def test_finds_every_group_that_hits_the_target(self):
        self.assertEqual(subsets_with_sum([4, 1, 3, 2], 5), [[1, 4], [2, 3]])
        self.assertEqual(subsets_with_sum([2, 3, 5, 6, 8], 10), [[2, 3, 5], [2, 8]])

    def test_no_answer_exact_single_value_target_of_everything(self):
        self.assertEqual(subsets_with_sum([5, 6], 4), [])
        self.assertEqual(subsets_with_sum([7, 3], 7), [[7]])
        self.assertEqual(subsets_with_sum([1, 2, 3], 6), [[1, 2, 3]])

    def test_agrees_with_checking_every_subset(self):
        nums = [3, 9, 1, 7, 4, 6, 2]
        brute = []
        for mask in range(1 << len(nums)):
            pick = sorted(x for i, x in enumerate(nums) if mask & (1 << i))
            if sum(pick) == 13:
                brute.append(",".join(map(str, pick)))
        got = sorted(",".join(map(str, p)) for p in subsets_with_sum(nums, 13))
        self.assertEqual(got, sorted(brute))


if __name__ == "__main__":
    unittest.main()
