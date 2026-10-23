import unittest

from observable_door import ObservableDoor


class ObservableDoorTest(unittest.TestCase):
    def test_listeners_hear_every_legal_transition_and_nothing_for_rejected_ones(self):
        door = ObservableDoor()
        heard = []
        door.subscribe(heard.append)
        door.send("open")
        door.send("lock")  # illegal while open
        door.send("close")
        self.assertEqual(heard, [
            {"from": "closed", "event": "open", "to": "open"},
            {"from": "open", "event": "close", "to": "closed"},
        ])

    def test_a_listener_that_reads_the_door_sees_the_new_state(self):
        door = ObservableDoor()
        seen = []
        door.subscribe(lambda _: seen.append(door.state))
        door.send("open")
        door.send("close")
        self.assertEqual(seen, ["open", "closed"])

    def test_a_throwing_listener_neither_undoes_the_move_nor_stops_other_listeners(self):
        door = ObservableDoor()
        heard = []

        def offline(_):
            raise RuntimeError("alarm offline")

        door.subscribe(offline)
        door.subscribe(lambda e: heard.append(e["to"]))
        result = door.send("lock")
        self.assertTrue(result["ok"])
        self.assertEqual(door.state, "locked")
        self.assertEqual(heard, ["locked"])
        self.assertEqual([str(e) for e in result["errors"]], ["alarm offline"])

    def test_an_unsubscribed_listener_hears_nothing_more(self):
        door = ObservableDoor()
        heard = []
        off = door.subscribe(lambda e: heard.append(e["to"]))
        door.send("open")
        off()
        door.send("close")
        self.assertEqual(heard, ["open"])


if __name__ == "__main__":
    unittest.main()
