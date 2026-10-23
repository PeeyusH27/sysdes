import unittest

from min_max_stack import MinMaxStack


class MinMaxStackTest(unittest.TestCase):
    def test_min_and_max_track_the_current_contents(self):
        s = MinMaxStack()
        for v in (3, 5, 2):
            s.push(v)
        self.assertEqual((s.get_min(), s.get_max()), (2, 5))
        self.assertEqual(s.pop(), 2)
        self.assertEqual((s.get_min(), s.get_max(), s.top()), (3, 5, 5))

    def test_duplicates_of_the_extreme_value_survive_a_pop(self):
        s = MinMaxStack()
        for v in (2, 1, 1):
            s.push(v)
        s.pop()
        self.assertEqual(s.get_min(), 1)
        s.pop()
        self.assertEqual(s.get_min(), 2)

    def test_a_single_value_is_both_min_and_max(self):
        s = MinMaxStack()
        s.push(-7)
        self.assertEqual((s.get_min(), s.get_max(), s.top()), (-7, -7, -7))


if __name__ == "__main__":
    unittest.main()
