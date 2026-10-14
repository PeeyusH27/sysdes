import unittest

from frequency import can_construct, count_all


class FrequencyTest(unittest.TestCase):
    def test_counts_every_value(self):
        self.assertEqual(list(count_all("banana").items()), [("b", 1), ("a", 3), ("n", 2)])
        self.assertEqual(len(count_all([])), 0)

    def test_spends_letters_like_a_budget(self):
        self.assertTrue(can_construct("noon", "onion"))
        self.assertFalse(can_construct("tooth", "photo"))
        self.assertTrue(can_construct("", "abc"))
        self.assertFalse(can_construct("a", ""))


if __name__ == "__main__":
    unittest.main()
