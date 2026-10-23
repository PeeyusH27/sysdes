import unittest

from emitter import Emitter


class EmitterTest(unittest.TestCase):
    def test_listeners_hear_events_in_the_order_they_subscribed(self):
        emitter = Emitter()
        heard = []
        emitter.subscribe(lambda e: heard.append(f"a:{e}"))
        emitter.subscribe(lambda e: heard.append(f"b:{e}"))
        emitter.emit(1)
        self.assertEqual(heard, ["a:1", "b:1"])

    def test_subscribing_twice_is_one_subscription_and_unsubscribing_twice_is_harmless(self):
        emitter = Emitter()
        heard = []
        fn = heard.append
        off = emitter.subscribe(fn)
        emitter.subscribe(fn)
        emitter.emit("x")
        self.assertEqual(heard, ["x"])
        off()
        off()
        emitter.emit("y")
        self.assertEqual(heard, ["x"])
        self.assertEqual(emitter.size, 0)

    def test_a_listener_that_unsubscribes_another_during_a_notification_does_not_break_the_loop(self):
        emitter = Emitter()
        heard = []
        offs = {}

        def a(_):
            heard.append("a")
            offs["b"]()

        emitter.subscribe(a)
        offs["b"] = emitter.subscribe(lambda _: heard.append("b"))
        emitter.emit(1)
        emitter.emit(2)
        self.assertEqual(heard, ["a", "b", "a"])  # b still hears round 1 (the copy), and is gone for round 2

    def test_a_throwing_listener_does_not_stop_the_others_and_its_error_is_returned(self):
        emitter = Emitter()
        heard = []

        def boom(_):
            raise RuntimeError("boom")

        emitter.subscribe(boom)
        emitter.subscribe(heard.append)
        errors = emitter.emit("x")
        self.assertEqual(heard, ["x"])
        self.assertEqual([str(e) for e in errors], ["boom"])


if __name__ == "__main__":
    unittest.main()
