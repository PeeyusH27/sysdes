import unittest

from group_by_key import group_by


class GroupByKeyTest(unittest.TestCase):
    def test_groups_by_any_computed_key_keeping_input_order(self):
        self.assertEqual(group_by(["ant", "bee", "goat", "cat", "deer"], len), [["ant", "bee", "cat"], ["goat", "deer"]])
        self.assertEqual(group_by([1, 2, 3, 4, 5, 6], lambda n: n % 3), [[1, 4], [2, 5], [3, 6]])

    def test_a_sorted_letters_key_groups_anagrams(self):
        def sorted_letters(w):
            return "".join(sorted(w))

        self.assertEqual(group_by(["tab", "cat", "bat", "act"], sorted_letters), [["tab", "bat"], ["cat", "act"]])
        self.assertEqual(group_by([], sorted_letters), [])


if __name__ == "__main__":
    unittest.main()
