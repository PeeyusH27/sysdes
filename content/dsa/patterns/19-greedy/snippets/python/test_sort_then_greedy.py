import unittest

from sort_then_greedy import find_content_children


class SortThenGreedyTest(unittest.TestCase):
    def test_feeds_the_most_children(self):
        self.assertEqual(find_content_children([3, 1, 6, 2, 4], [2, 1, 5, 3, 1]), 4)
        self.assertEqual(find_content_children([7, 4, 5], [3, 1, 6, 2]), 1)
        self.assertEqual(find_content_children([1, 2], [1, 2, 3]), 2)

    def test_handles_nothing_to_give_or_nobody_to_feed(self):
        self.assertEqual(find_content_children([1, 2], []), 0)
        self.assertEqual(find_content_children([], [4]), 0)

    def test_does_not_reorder_the_inputs(self):
        greed = [3, 1]
        find_content_children(greed, [5, 1])
        self.assertEqual(greed, [3, 1])


if __name__ == "__main__":
    unittest.main()
