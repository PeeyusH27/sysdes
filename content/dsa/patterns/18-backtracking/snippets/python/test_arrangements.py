import unittest

from arrangements import arrangements


class ArrangementsTest(unittest.TestCase):
    def test_ordered_selections_of_k_items(self):
        self.assertEqual(
            arrangements(["a", "b", "c"], 2),
            [["a", "b"], ["a", "c"], ["b", "a"], ["b", "c"], ["c", "a"], ["c", "b"]],
        )

    def test_k_defaults_to_every_item_all_permutations(self):
        self.assertEqual(arrangements([1, 2, 3]), [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]])
        self.assertEqual(arrangements([7]), [[7]])
        self.assertEqual(len(arrangements([1, 2, 3, 4, 5])), 120)


if __name__ == "__main__":
    unittest.main()
