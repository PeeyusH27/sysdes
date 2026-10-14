import unittest

from min_heap import MinHeap


class MinHeapTest(unittest.TestCase):
    def test_pops_priority_data_pairs_in_priority_order(self):
        heap = MinHeap()
        for pair in [[5, "e"], [1, "a"], [4, "d"], [2, "b"], [3, "c"], [1, "z"]]:
            heap.push(pair)
        self.assertEqual(heap.size, 6)
        self.assertEqual(heap.peek()[0], 1)
        out = []
        while heap.size > 0:
            out.append(heap.pop()[0])
        self.assertEqual(out, [1, 1, 2, 3, 4, 5])

    def test_sorts_many_numbers_with_a_custom_comparator(self):
        heap = MinHeap(lambda a, b: a - b)
        values = [(i * 7919) % 211 for i in range(200)]
        for v in values:
            heap.push(v)
        out = []
        while heap.size > 0:
            out.append(heap.pop())
        self.assertEqual(out, sorted(values))

    def test_a_max_heap_is_the_same_class_with_the_comparator_flipped(self):
        heap = MinHeap(lambda a, b: b - a)
        for v in [3, 9, 1, 7]:
            heap.push(v)
        self.assertEqual(heap.pop(), 9)
        self.assertEqual(heap.pop(), 7)

    def test_pop_on_an_empty_heap_returns_none(self):
        heap = MinHeap()
        self.assertIsNone(heap.pop())
        heap.push([0, "x"])
        self.assertEqual(heap.pop(), [0, "x"])
        self.assertEqual(heap.size, 0)


if __name__ == "__main__":
    unittest.main()
