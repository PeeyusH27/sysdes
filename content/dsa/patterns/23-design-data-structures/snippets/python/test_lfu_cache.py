import unittest

from lfu_cache import LFUCache


class LFUCacheTest(unittest.TestCase):
    def test_evicts_the_least_frequently_used_key(self):
        c = LFUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        self.assertEqual(c.get(1), 1)   # 1 has 2 uses, 2 has 1
        c.put(3, 3)   # evicts 2
        self.assertEqual(c.get(2), -1)
        self.assertEqual(c.get(3), 3)

    def test_ties_go_to_the_least_recently_used_key(self):
        c = LFUCache(2)
        c.put(1, 1)
        c.put(2, 2)
        c.get(1)
        c.get(2)   # both have 2 uses; 1 is older
        c.put(3, 3)
        self.assertEqual(c.get(1), -1)
        self.assertEqual(c.get(2), 2)
        self.assertEqual(c.get(3), 3)

    def test_capacity_zero_stores_nothing_and_an_evicted_key_restarts_at_one_use(self):
        zero = LFUCache(0)
        zero.put(0, 0)
        self.assertEqual(zero.get(0), -1)
        c = LFUCache(1)
        c.put(1, 1)
        c.get(1)
        c.put(2, 2)   # evicts 1
        c.put(1, 5)   # 1 comes back with a fresh count, so it evicts 2
        self.assertEqual(c.get(2), -1)
        self.assertEqual(c.get(1), 5)


if __name__ == "__main__":
    unittest.main()
