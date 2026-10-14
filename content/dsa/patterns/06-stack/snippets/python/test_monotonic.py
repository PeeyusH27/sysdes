import unittest

from monotonic import next_greater_index, smaller_neighbours


def brute_next_greater(nums):
    out = []
    for i, x in enumerate(nums):
        out.append(next((j for j in range(i + 1, len(nums)) if nums[j] > x), -1))
    return out


class MonotonicTest(unittest.TestCase):
    def test_next_greater_index(self):
        self.assertEqual(next_greater_index([5, 2, 3, 1, 6, 4]), [4, 2, 4, 4, -1, -1])
        self.assertEqual(next_greater_index([3, 3, 1, 4]), [3, 3, 3, -1])
        self.assertEqual(next_greater_index([9, 7, 4]), [-1, -1, -1])
        self.assertEqual(next_greater_index([]), [])

    def test_next_greater_index_matches_brute_force_on_random_input(self):
        seed = 7
        for _ in range(50):
            nums = []
            for _ in range(12):
                seed = (seed * 1103515245 + 12345) % 2147483648
                nums.append(seed % 10)
            self.assertEqual(next_greater_index(nums), brute_next_greater(nums))

    def test_nearest_smaller_neighbours_on_both_sides(self):
        self.assertEqual(smaller_neighbours([4, 6, 5, 2, 7, 3]), ([-1, 0, 0, -1, 3, 3], [3, 2, 3, 6, 5, 6]))
        # Ties: right is strictly smaller, left is smaller or equal.
        self.assertEqual(smaller_neighbours([3, 1, 3, 3, 0]), ([-1, -1, 1, 2, -1], [1, 4, 4, 4, 5]))


if __name__ == "__main__":
    unittest.main()
