import unittest

from lru_cache import LRUCache, LRUCacheOrdered


class LRUCacheTest(unittest.TestCase):
    classes = (LRUCache, LRUCacheOrdered)

    def test_evicts_the_least_recently_used_key(self):
        for cls in self.classes:
            c = cls(2)
            c.put(1, 1)
            c.put(2, 2)
            self.assertEqual(c.get(1), 1)   # 1 is now the newest
            c.put(3, 3)   # evicts 2
            self.assertEqual(c.get(2), -1)
            c.put(4, 4)   # evicts 1
            self.assertEqual(c.get(1), -1)
            self.assertEqual(c.get(3), 3)
            self.assertEqual(c.get(4), 4)

    def test_updating_a_key_counts_as_a_use_and_never_grows_the_cache(self):
        for cls in self.classes:
            c = cls(2)
            c.put(2, 1)
            c.put(2, 2)
            self.assertEqual(c.get(2), 2)
            c.put(1, 1)
            c.put(4, 1)   # evicts 2
            self.assertEqual(c.get(2), -1)
            self.assertEqual(c.get(1), 1)

    def test_capacity_one_keeps_only_the_newest_key(self):
        for cls in self.classes:
            c = cls(1)
            c.put(1, 10)
            c.put(2, 20)
            self.assertEqual(c.get(1), -1)
            self.assertEqual(c.get(2), 20)


if __name__ == "__main__":
    unittest.main()
