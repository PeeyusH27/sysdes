"""Run from this folder:  python3 -m unittest discover -p "test_*.py" """
import unittest

from heap import Heap
from k_way_merge import merge_sorted_arrays
from top_k import k_largest, k_smallest_by
from two_heaps import running_medians


def drain(heap):
    out = []
    while heap.size() > 0:
        out.append(heap.pop())
    return out


class HeapTest(unittest.TestCase):
    def test_min_heap_pops_values_in_ascending_order(self):
        heap = Heap()
        for x in [5, 3, 8, 1, 4, 1, -2]:
            heap.push(x)
        self.assertEqual(heap.size(), 7)
        self.assertEqual(heap.peek(), -2)
        self.assertEqual(drain(heap), [-2, 1, 1, 3, 4, 5, 8])

    def test_a_reversed_comparator_makes_a_max_heap(self):
        heap = Heap(lambda a, b: b - a)
        for x in [5, 3, 8, 1, 4]:
            heap.push(x)
        self.assertEqual(drain(heap), [8, 5, 4, 3, 1])

    def test_orders_pairs_by_a_key(self):
        heap = Heap(lambda a, b: a[1] - b[1])
        heap.push(("x", 3))
        heap.push(("y", 1))
        heap.push(("z", 2))
        self.assertEqual([name for name, _ in drain(heap)], ["y", "z", "x"])

    def test_empty_heap_peek_and_pop_return_none(self):
        heap = Heap()
        self.assertIsNone(heap.peek())
        self.assertIsNone(heap.pop())
        heap.push(7)
        self.assertEqual(heap.pop(), 7)
        self.assertEqual(heap.size(), 0)

    def test_agrees_with_sorting_on_random_input(self):
        seed = 42
        values = []
        for _ in range(300):
            seed = (seed * 1103515245 + 12345) % 2147483648
            values.append(seed % 1000)
        heap = Heap()
        for v in values:
            heap.push(v)
        self.assertEqual(drain(heap), sorted(values))


class TopKTest(unittest.TestCase):
    def test_keeps_the_k_largest_values_largest_first(self):
        self.assertEqual(k_largest([3, 1, 5, 12, 2, 11, 7], 3), [12, 11, 7])
        self.assertEqual(k_largest([4, 4, 1, 4, 2], 2), [4, 4])
        self.assertEqual(k_largest([-5, -1, -3], 1), [-1])

    def test_k_equal_to_the_length_returns_everything_sorted(self):
        self.assertEqual(k_largest([2, 9, 4], 3), [9, 4, 2])
        self.assertEqual(k_largest([], 2), [])

    def test_k_smallest_by_a_key(self):
        dist = lambda p: p[0] * p[0] + p[1] * p[1]
        self.assertEqual(k_smallest_by([(3, 3), (1, -2), (-4, 0), (0, 1)], 2, dist), [(0, 1), (1, -2)])
        self.assertEqual(k_smallest_by(["pear", "fig", "banana", "kiwi"], 1, len), ["fig"])


class KWayMergeTest(unittest.TestCase):
    def test_merges_several_sorted_arrays(self):
        self.assertEqual(merge_sorted_arrays([[1, 4, 9], [2, 3, 10], [5, 6]]), [1, 2, 3, 4, 5, 6, 9, 10])
        self.assertEqual(merge_sorted_arrays([[-3, 0], [-5, 7, 8]]), [-5, -3, 0, 7, 8])

    def test_handles_empty_inputs_and_duplicates(self):
        self.assertEqual(merge_sorted_arrays([]), [])
        self.assertEqual(merge_sorted_arrays([[], []]), [])
        self.assertEqual(merge_sorted_arrays([[1, 1], [], [0, 1]]), [0, 1, 1, 1])


def brute_medians(nums):
    out = []
    for i in range(len(nums)):
        s = sorted(nums[: i + 1])
        n = len(s)
        out.append(s[(n - 1) // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2)
    return out


class TwoHeapsTest(unittest.TestCase):
    def test_median_after_every_number(self):
        self.assertEqual(running_medians([6, 2, 9, 1]), [6, 4, 6, 4])
        self.assertEqual(running_medians([1, 2, 3]), [1, 1.5, 2])
        self.assertEqual(running_medians([]), [])

    def test_matches_re_sorting_on_mixed_input(self):
        nums = [5, -3, 5, 12, 0, 0, -7, 8, 8, 1, 4, -2]
        self.assertEqual(running_medians(nums), brute_medians(nums))


if __name__ == "__main__":
    unittest.main()
