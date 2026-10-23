import unittest

from time_map import TimeMap, last_at_or_before


class TimeMapTest(unittest.TestCase):
    def test_finds_the_newest_write_at_or_before_the_time(self):
        m = TimeMap()
        m.set("love", "high", 10)
        m.set("love", "low", 20)
        self.assertEqual(m.get("love", 5), "")
        self.assertEqual(m.get("love", 10), "high")
        self.assertEqual(m.get("love", 15), "high")
        self.assertEqual(m.get("love", 20), "low")
        self.assertEqual(m.get("love", 99), "low")

    def test_keys_have_independent_histories_and_unknown_keys_are_empty(self):
        m = TimeMap()
        m.set("a", "p", 1)
        m.set("b", "q", 2)
        m.set("a", "r", 3)
        self.assertEqual(m.get("a", 2), "p")
        self.assertEqual(m.get("b", 2), "q")
        self.assertEqual(m.get("zzz", 2), "")

    def test_last_at_or_before_matches_a_linear_scan(self):
        history = [(2, "a"), (4, "b"), (7, "c"), (9, "d")]
        for t in range(12):
            want = -1
            for i, (time, _) in enumerate(history):
                if time <= t:
                    want = i
            self.assertEqual(last_at_or_before(history, t), want)
        self.assertEqual(last_at_or_before([], 5), -1)


if __name__ == "__main__":
    unittest.main()
