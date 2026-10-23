import unittest

from door_table import Door


class DoorTableTest(unittest.TestCase):
    def test_walks_the_legal_path_and_reports_the_action_for_each_step(self):
        door = Door()
        steps = [door.send(e) for e in ("open", "close", "lock", "unlock")]
        self.assertEqual([s["state"] for s in steps], ["open", "closed", "locked", "closed"])
        self.assertEqual([s["action"] for s in steps], ["swing open", "latch", "throw bolt", "retract bolt"])

    def test_an_illegal_event_is_rejected_and_changes_nothing(self):
        door = Door()
        self.assertEqual(door.send("close"), {"ok": False, "state": "closed"})
        door.send("open")
        self.assertEqual(door.send("lock"), {"ok": False, "state": "open"})  # the case the flags version allowed
        door.send("close")
        door.send("lock")
        self.assertEqual(door.send("open"), {"ok": False, "state": "locked"})

    def test_every_one_of_the_12_state_and_event_pairs_has_exactly_one_outcome(self):
        reach = {"closed": [], "open": ["open"], "locked": ["lock"]}  # events that bring a new door to each state
        accepted = 0
        for state, path in reach.items():
            for event in ("open", "close", "lock", "unlock"):
                door = Door()
                for e in path:
                    door.send(e)
                accepted += 1 if door.send(event)["ok"] else 0
        self.assertEqual(accepted, 4)

    def test_an_unknown_event_is_just_rejected(self):
        self.assertEqual(Door().send("toString"), {"ok": False, "state": "closed"})


if __name__ == "__main__":
    unittest.main()
