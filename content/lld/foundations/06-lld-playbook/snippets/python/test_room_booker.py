import unittest

from room_booker import RoomBooker, overlaps


class RoomBookerTest(unittest.TestCase):
    def test_back_to_back_meetings_do_not_clash_overlapping_ones_do(self):
        self.assertFalse(overlaps({"start": 9, "end": 10}, {"start": 10, "end": 11}))
        self.assertTrue(overlaps({"start": 9, "end": 11}, {"start": 10, "end": 12}))
        self.assertTrue(overlaps({"start": 9, "end": 12}, {"start": 10, "end": 11}))

    def test_a_booking_blocks_the_room_only_for_its_own_slot(self):
        booker = RoomBooker(["A", "B"])
        self.assertTrue(booker.book("A", 9, 10, "ann"))
        self.assertFalse(booker.book("A", 9, 10, "bob"))
        self.assertTrue(booker.book("A", 10, 11, "bob"))
        self.assertTrue(booker.book("B", 9, 10, "bob"))

    def test_free_rooms_lists_rooms_with_no_clash_in_the_slot(self):
        booker = RoomBooker(["A", "B", "C"])
        booker.book("A", 9, 11, "ann")
        booker.book("B", 10, 12, "bob")
        self.assertEqual(booker.free_rooms(9, 10), ["B", "C"])
        self.assertEqual(booker.free_rooms(10, 11), ["C"])

    def test_rejects_an_empty_or_backwards_slot_and_an_unknown_room(self):
        booker = RoomBooker(["A"])
        with self.assertRaisesRegex(ValueError, "start must be before end"):
            booker.book("A", 10, 10, "ann")
        with self.assertRaisesRegex(ValueError, "start must be before end"):
            booker.book("A", 11, 10, "ann")
        with self.assertRaisesRegex(KeyError, "unknown room: Z"):
            booker.is_free("Z", 9, 10)


if __name__ == "__main__":
    unittest.main()
