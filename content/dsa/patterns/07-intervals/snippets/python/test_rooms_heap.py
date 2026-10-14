import unittest

from rooms_heap import min_rooms
from sweep_line import max_overlap


class TestRoomsHeap(unittest.TestCase):
    def test_counts_rooms_like_the_sweep_line_does(self):
        self.assertEqual(min_rooms([[2, 7], [0, 5], [6, 9], [1, 3], [4, 6]]), 3)
        self.assertEqual(min_rooms([[1, 5], [5, 10], [10, 15]]), 1)
        self.assertEqual(min_rooms([[1, 10], [2, 3], [4, 5]]), 2)
        self.assertEqual(min_rooms([]), 0)

    def test_agrees_with_the_sweep_line_on_many_inputs(self):
        # Stands in for the JavaScript's MinHeap test: the heap of end times must always free the earliest room.
        for n in range(1, 8):
            meetings = [[(i * 7) % 11, (i * 7) % 11 + 1 + (i * 3) % 5] for i in range(n * 3)]
            self.assertEqual(min_rooms(meetings), max_overlap(meetings))


if __name__ == "__main__":
    unittest.main()
