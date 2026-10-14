import unittest

from longest_window import longest_at_most_k_distinct


class LongestWindowTest(unittest.TestCase):
    def test_longest_substring_with_at_most_k_distinct_characters(self):
        self.assertEqual(longest_at_most_k_distinct("abcbbca", 2), 5)  # "bcbbc"
        self.assertEqual(longest_at_most_k_distinct("aabbb", 1), 3)
        self.assertEqual(longest_at_most_k_distinct("abcabc", 3), 6)

    def test_edge_cases(self):
        self.assertEqual(longest_at_most_k_distinct("", 2), 0)
        self.assertEqual(longest_at_most_k_distinct("abc", 0), 0)
        self.assertEqual(longest_at_most_k_distinct("zzzz", 1), 4)


if __name__ == "__main__":
    unittest.main()
