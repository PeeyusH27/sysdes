import unittest

from randomized_set import RandomizedSet


class RandomizedSetTest(unittest.TestCase):
    def test_insert_and_remove_report_whether_anything_changed(self):
        s = RandomizedSet()
        self.assertTrue(s.insert(1))
        self.assertFalse(s.insert(1))
        self.assertFalse(s.remove(2))
        self.assertTrue(s.insert(2))
        self.assertTrue(s.remove(1))
        self.assertEqual(s.get_random(), 2)

    def test_removing_the_last_element_or_a_middle_one_keeps_the_structure_consistent(self):
        s = RandomizedSet()
        for v in (4, 5, 6, 7):
            s.insert(v)
        self.assertTrue(s.remove(7))   # last element
        self.assertTrue(s.remove(4))   # middle: 6 moves into slot 0
        self.assertFalse(s.remove(4))
        self.assertEqual(sorted(s.items), [5, 6])
        self.assertEqual(s.index[6], s.items.index(6))
        self.assertEqual(s.index[5], s.items.index(5))

    def test_get_random_returns_members_and_eventually_every_member(self):
        s = RandomizedSet()
        for v in (0, 1, 2):   # 0 is a falsy value on purpose
            s.insert(v)
        seen = {s.get_random() for _ in range(300)}
        self.assertEqual(sorted(seen), [0, 1, 2])


if __name__ == "__main__":
    unittest.main()
