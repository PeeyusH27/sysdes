import threading
import time
import unittest

from race_after import Rooms
from race_before import RoomsRacy


def book_from_threads(rooms, room, names):
    results = [None] * len(names)

    def work(i, who):
        results[i] = rooms.book(room, who)

    threads = [threading.Thread(target=work, args=(i, who)) for i, who in enumerate(names)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


class RaceTest(unittest.TestCase):
    def test_before_check_then_act_lets_two_threads_book_the_same_room(self):
        # The barrier forces the bad interleaving: both threads pass the check before either acts.
        barrier = threading.Barrier(2, timeout=5)
        rooms = RoomsRacy(between=barrier.wait)
        results = book_from_threads(rooms, "A", ["ann", "bob"])
        self.assertEqual(results, [True, True])

    def test_after_exactly_one_of_several_threads_gets_the_room(self):
        rooms = Rooms(between=lambda: time.sleep(0.01))
        results = book_from_threads(rooms, "A", ["ann", "bob", "cy", "di", "ed"])
        self.assertEqual(results.count(True), 1)
        self.assertIn(rooms.owner("A"), ["ann", "bob", "cy", "di", "ed"])

    def test_after_other_rooms_are_unaffected(self):
        rooms = Rooms()
        self.assertTrue(rooms.book("A", "ann"))
        self.assertTrue(rooms.book("B", "bob"))
        self.assertFalse(rooms.book("A", "cy"))


if __name__ == "__main__":
    unittest.main()
