"""Run from this folder:  python3 -m unittest test_logger"""
import itertools
import threading
import time
import unittest

from logger import LogManager
from models import Appender, AsyncAppender, Level, Record, json


def manager():
    ticks = itertools.count(1)
    return LogManager(now=lambda: next(ticks))


class Mem:
    def __init__(self, **kw):
        self.lines = []
        self.appender = Appender(self.lines.append, **kw)


class Boom:
    def append(self, record):
        raise RuntimeError("disk full")


class LoggerTest(unittest.TestCase):
    def test_an_event_below_the_effective_level_is_dropped_at_or_above_is_written(self):
        m, mem = manager(), Mem()
        m.root.add_appender(mem.appender)
        self.assertEqual(m.get_logger("app").log(Level.DEBUG, "noise"), 0)
        self.assertEqual(m.get_logger("app").log(Level.INFO, "hello"), 1)
        self.assertEqual(mem.lines, ["1 INFO app - hello"])

    def test_a_child_inherits_the_nearest_ancestor_level_an_explicit_level_wins(self):
        m = manager()
        m.get_logger("app").level = Level.WARN
        m.get_logger("app.db.pool").level = Level.DEBUG
        self.assertEqual(m.get_logger("app.db").effective_level, Level.WARN)
        self.assertEqual(m.get_logger("app.db.pool").effective_level, Level.DEBUG)
        self.assertEqual(m.get_logger("other").effective_level, Level.INFO)

    def test_changing_a_level_at_runtime_changes_every_descendant_that_inherits_it(self):
        m = manager()
        db = m.get_logger("app.db")
        self.assertFalse(db.is_enabled(Level.DEBUG))
        m.get_logger("app").level = Level.DEBUG
        self.assertTrue(db.is_enabled(Level.DEBUG))

    def test_appenders_on_an_ancestor_receive_events_from_its_descendants(self):
        m, a, b = manager(), Mem(), Mem()
        m.get_logger("app").add_appender(a.appender)
        m.get_logger("app.db").add_appender(b.appender)
        self.assertEqual(m.get_logger("app.db").log(Level.ERROR, "down"), 2)
        self.assertEqual((len(a.lines), len(b.lines)), (1, 1))

    def test_each_appender_has_its_own_threshold(self):
        m, console, file = manager(), Mem(threshold=Level.INFO), Mem(threshold=Level.ERROR)
        m.root.add_appender(console.appender)
        m.root.add_appender(file.appender)
        log = m.get_logger("svc")
        self.assertEqual([log.log(Level.INFO, "a"), log.log(Level.ERROR, "b")], [1, 2])
        self.assertEqual(len(console.lines), 2)
        self.assertEqual(file.lines, ["2 ERROR svc - b"])

    def test_the_formatter_is_swappable_per_appender(self):
        m, p, j = manager(), Mem(), Mem(fmt=json)
        m.root.add_appender(p.appender)
        m.root.add_appender(j.appender)
        m.get_logger("a").log(Level.WARN, 'x "y"')
        self.assertEqual(j.lines, ['{"time":1,"level":"WARN","logger":"a","message":"x \\"y\\""}'])
        self.assertEqual(p.lines, ['1 WARN a - x "y"'])

    def test_a_lazy_message_is_built_only_when_the_level_is_enabled(self):
        m, built = manager(), []

        def msg():
            built.append(1)
            return "expensive"

        m.get_logger("a").log(Level.DEBUG, msg)
        self.assertEqual(len(built), 0)
        m.get_logger("a").log(Level.INFO, msg)
        self.assertEqual(len(built), 1)

    def test_an_appender_added_during_a_call_does_not_disturb_that_call(self):
        m, late = manager(), Mem()
        log = m.get_logger("a")

        class Adder:
            def append(self, record):
                log.add_appender(late.appender)
                return True

        log.add_appender(Adder())
        self.assertEqual(log.log(Level.INFO, "one"), 1)
        self.assertEqual(log.log(Level.INFO, "two"), 2)
        self.assertEqual(len(late.lines), 1)

    def test_one_appender_that_throws_does_not_stop_the_others(self):
        m, ok = manager(), Mem()
        m.root.add_appender(Boom())
        m.root.add_appender(ok.appender)
        self.assertEqual(m.get_logger("a").log(Level.INFO, "still here"), 1)
        self.assertEqual(len(ok.lines), 1)

    def test_an_async_appender_writes_in_order_and_close_flushes_everything(self):
        m, mem = manager(), Mem()
        queued = AsyncAppender(mem.appender, capacity=100)
        m.root.add_appender(queued)
        for i in range(50):
            m.get_logger("a").log(Level.INFO, f"m{i}")
        queued.close()
        self.assertEqual(len(mem.lines), 50)
        self.assertTrue(mem.lines[0].endswith("m0") and mem.lines[49].endswith("m49"))

    def test_a_full_drop_queue_loses_the_newest_events_and_counts_them(self):
        gate, out = threading.Event(), []

        def slow(line):
            gate.wait()
            out.append(line)

        queued = AsyncAppender(Appender(slow), capacity=2)
        for i in range(20):
            queued.append(Record(i, Level.INFO, "a", f"m{i}"))
        dropped = queued.dropped
        gate.set()
        queued.close()
        self.assertIn(dropped, (17, 18))  # the worker holds one, the queue two
        self.assertEqual(len(out) + dropped, 20)

    def test_a_block_queue_slows_the_producer_but_loses_nothing(self):
        out = []

        def slow(line):
            time.sleep(0.001)
            out.append(line)

        queued = AsyncAppender(Appender(slow), capacity=2, block=True)
        for i in range(40):
            queued.append(Record(i, Level.INFO, "a", f"m{i}"))
        queued.close()
        self.assertEqual((len(out), queued.dropped), (40, 0))

    def test_8_threads_share_one_appender_every_line_arrives_whole(self):
        m, mem = manager(), Mem()
        m.root.add_appender(mem.appender)

        def work(w):
            for i in range(500):
                m.get_logger(f"w{w}").log(Level.INFO, f"line-{i}")

        threads = [threading.Thread(target=work, args=(w,)) for w in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(len(mem.lines), 4000)
        self.assertTrue(all(" INFO w" in l and " - line-" in l for l in mem.lines))


if __name__ == "__main__":
    unittest.main()
