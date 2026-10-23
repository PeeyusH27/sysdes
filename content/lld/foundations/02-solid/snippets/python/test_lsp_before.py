import unittest

from lsp_before import Rectangle, Square, area_at_4_by_5


class LspBeforeTest(unittest.TestCase):
    def test_the_same_call_gives_a_different_answer_for_the_subclass(self):
        self.assertEqual(area_at_4_by_5(Rectangle(1, 1)), 20)
        self.assertEqual(area_at_4_by_5(Square(1, 1)), 25)


if __name__ == "__main__":
    unittest.main()
