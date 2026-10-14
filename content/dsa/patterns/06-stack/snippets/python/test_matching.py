import unittest

from matching import is_balanced, simplify_path


class MatchingTest(unittest.TestCase):
    def test_accepts_properly_nested_brackets(self):
        self.assertTrue(is_balanced("{[()()]}"))
        self.assertTrue(is_balanced("()[]{}"))
        self.assertTrue(is_balanced(""))

    def test_rejects_crossed_unclosed_and_unopened_brackets(self):
        self.assertFalse(is_balanced("([)]"))
        self.assertFalse(is_balanced("(()"))
        self.assertFalse(is_balanced("())"))
        self.assertFalse(is_balanced("]"))

    def test_simplifies_a_path_by_undoing_the_latest_directory_on_dotdot(self):
        self.assertEqual(simplify_path("/home//user/./docs/../pics/"), "/home/user/pics")
        self.assertEqual(simplify_path("/a/b/../../.."), "/")
        self.assertEqual(simplify_path("/"), "/")


if __name__ == "__main__":
    unittest.main()
