import unittest

from hold import RoomHolds


class RoomHoldsTest(unittest.TestCase):
    def test_a_hold_lasts_exactly_ten_minutes_with_no_waiting(self):
        t = [0]
        holds = RoomHolds(now=lambda: t[0])
        self.assertTrue(holds.hold("A"))
        t[0] = 599.999
        self.assertTrue(holds.is_held("A"))
        self.assertFalse(holds.hold("A"))
        t[0] = 600
        self.assertFalse(holds.is_held("A"))
        self.assertTrue(holds.hold("A"))

    def test_holds_are_per_room(self):
        holds = RoomHolds(now=lambda: 0)
        holds.hold("A")
        self.assertFalse(holds.is_held("B"))


if __name__ == "__main__":
    unittest.main()
