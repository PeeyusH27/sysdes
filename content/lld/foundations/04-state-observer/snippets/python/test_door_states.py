import unittest

from door_states import Door


class DoorStatesTest(unittest.TestCase):
    def test_walks_the_legal_path_and_reports_the_action_for_each_step(self):
        door = Door()
        steps = [door.send(e) for e in ("open", "close", "lock", "unlock")]
        self.assertEqual([s["state"] for s in steps], ["open", "closed", "locked", "closed"])
        self.assertEqual([s["action"] for s in steps], ["swing open", "latch", "throw bolt", "retract bolt"])

    def test_an_illegal_event_is_rejected_and_changes_nothing(self):
        door = Door()
        self.assertEqual(door.send("close"), {"ok": False, "state": "closed"})
        door.send("open")
        self.assertEqual(door.send("lock"), {"ok": False, "state": "open"})
        door.send("close")
        door.send("lock")
        self.assertEqual(door.send("open"), {"ok": False, "state": "locked"})

    def test_an_unknown_event_even_one_named_like_a_state_method_is_just_rejected(self):
        door = Door()
        self.assertEqual(door.send("toString"), {"ok": False, "state": "closed"})
        self.assertEqual(door.send("name"), {"ok": False, "state": "closed"})


if __name__ == "__main__":
    unittest.main()
