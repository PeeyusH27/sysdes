import unittest

from trees import from_array


class TestTrees(unittest.TestCase):
    def test_builds_a_tree_from_level_order_with_none(self):
        root = from_array([8, 3, 10, None, 6, None, 14])
        self.assertEqual(root.val, 8)
        self.assertIsNone(root.left.left)
        self.assertEqual(root.left.right.val, 6)
        self.assertEqual(root.right.right.val, 14)

    def test_empty_input_gives_none(self):
        self.assertIsNone(from_array([]))
        self.assertIsNone(from_array([None]))


if __name__ == "__main__":
    unittest.main()
