"""Run from this folder:  python3 -m unittest test_cache"""
import random
import threading
import unittest
from collections import OrderedDict

from cache import Cache, Removal, Stats
from policies import FifoPolicy


def fill(c, *keys):
    for i, k in enumerate(keys):
        c.put(k, i)


class Clock:
    def __init__(self, t=0):
        self.t = t

    def __call__(self):
        return self.t


class CacheTest(unittest.TestCase):
    def test_evicts_the_least_recently_used_key(self):
        c = Cache(2)
        fill(c, "a", "b")
        c.get("a")  # a is now newer than b
        c.put("c", 9)
        self.assertIsNone(c.get("b"))
        self.assertEqual([c.get("a"), c.get("c")], [0, 9])

    def test_updating_an_existing_key_refreshes_it_and_never_evicts(self):
        c = Cache(2)
        fill(c, "a", "b")
        c.put("a", 10)
        self.assertEqual(len(c), 2)
        c.put("c", 1)  # b is the oldest now
        self.assertIsNone(c.get("b"))
        self.assertEqual(c.get("a"), 10)

    def test_capacity_one_keeps_only_the_latest_key(self):
        c = Cache(1)
        fill(c, "a", "b")
        self.assertEqual([c.get("a"), c.get("b"), len(c)], [None, 1, 1])

    def test_fifo_ignores_reads_so_the_same_sequence_evicts_a_different_key(self):
        c = Cache(2, FifoPolicy())
        fill(c, "a", "b")
        c.get("a")
        c.put("c", 9)
        self.assertIsNone(c.get("a"))  # LRU would have kept a
        self.assertEqual(c.get("b"), 1)

    def test_delete_frees_a_slot_and_leaves_no_ghost_in_the_policy(self):
        c = Cache(2)
        fill(c, "a", "b")
        self.assertTrue(c.delete("a"))
        self.assertFalse(c.delete("a"))
        c.put("c", 2)  # fits without evicting
        c.put("d", 3)  # now b is the oldest
        self.assertIsNone(c.get("b"))
        self.assertEqual(len(c), 2)

    def test_an_entry_expires_exactly_at_its_deadline(self):
        t = Clock(1000)
        c = Cache(3, ttl_ms=100, now=t)
        c.put("a", 1)
        t.t = 1099
        self.assertEqual(c.get("a"), 1)
        t.t = 1100
        self.assertIsNone(c.get("a"))
        self.assertEqual(len(c), 0)

    def test_a_per_key_ttl_overrides_the_default_and_a_hit_does_not_extend_it(self):
        t = Clock()
        c = Cache(3, ttl_ms=100, now=t)
        c.put("short", 1, 10)
        c.put("long", 2)
        t.t = 50
        self.assertEqual(c.get("long"), 2)
        self.assertIsNone(c.get("short"))
        t.t = 100
        self.assertIsNone(c.get("long"))

    def test_listeners_hear_about_evictions_expiries_and_deletes_with_the_reason(self):
        t = Clock()
        c = Cache(2, ttl_ms=50, now=t)
        seen = []
        c.on_remove(lambda k, v, why: seen.append((k, v, why)))
        fill(c, "a", "b")
        c.put("c", 7)  # evicts a
        c.delete("b")
        t.t = 60
        c.get("c")  # expired
        self.assertEqual(seen, [("a", 0, Removal.EVICTED), ("b", 1, Removal.DELETED), ("c", 7, Removal.EXPIRED)])

    def test_stats_count_hits_misses_and_evictions(self):
        c = Cache(1)
        c.put("a", 1)
        c.get("a")
        c.get("x")
        c.put("b", 2)
        self.assertEqual(c.stats, Stats(hits=1, misses=1, evictions=1))

    def test_rejects_a_capacity_below_1(self):
        with self.assertRaises(ValueError):
            Cache(0)

    def test_matches_a_simple_ordered_dict_model_over_2000_random_operations(self):
        rnd = random.Random(7)
        c = Cache(4)
        model = OrderedDict()  # move_to_end on use: oldest first
        for i in range(2000):
            k = f"k{rnd.randrange(9)}"
            if rnd.random() < 0.5:
                c.put(k, i)
                if k not in model and len(model) == 4:
                    model.popitem(last=False)
                model[k] = i
                model.move_to_end(k)
            else:
                want = model.get(k)
                if k in model:
                    model.move_to_end(k)
                self.assertEqual(c.get(k), want, f"get {k} at step {i}")
            self.assertEqual(len(c), len(model), f"size at step {i}")

    def test_8_threads_20000_operations_never_over_capacity(self):
        c = Cache(50)
        errors = []

        def work(seed):
            rnd = random.Random(seed)
            try:
                for i in range(2500):
                    k = rnd.randrange(200)
                    if rnd.randrange(3) == 0:
                        c.put(k, i)
                    else:
                        c.get(k)
                    if len(c) > 50:
                        raise AssertionError("over capacity")
            except Exception as e:  # reported on the main thread
                errors.append(e)

        threads = [threading.Thread(target=work, args=(s,)) for s in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(errors, [])
        self.assertLessEqual(len(c), 50)


if __name__ == "__main__":
    unittest.main()
