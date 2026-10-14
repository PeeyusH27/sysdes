import unittest

from seen_set import first_repeat


class SeenSetTest(unittest.TestCase):
    def test_returns_the_first_value_seen_twice(self):
        self.assertEqual(first_repeat([4, 7, 2, 9, 7, 1]), 7)
        self.assertEqual(first_repeat([3, 1, 3, 1]), 3)
        self.assertEqual(first_repeat("abcb"), "b")

    def test_returns_none_when_every_value_is_distinct(self):
        self.assertIsNone(first_repeat([5, 3, 8, 1]))
        self.assertIsNone(first_repeat([]))


if __name__ == "__main__":
    unittest.main()
