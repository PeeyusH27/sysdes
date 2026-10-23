import unittest

from lsp_after import Rectangle, Square, total_area


class LspAfterTest(unittest.TestCase):
    def test_any_shape_works_wherever_an_area_is_needed(self):
        self.assertEqual(total_area([Rectangle(4, 5), Square(3)]), 29)

    def test_resizing_a_rectangle_returns_a_new_one_and_leaves_the_original_alone(self):
        r = Rectangle(2, 3)
        self.assertEqual(r.with_width(4).area(), 12)
        self.assertEqual(r.area(), 6)


if __name__ == "__main__":
    unittest.main()
