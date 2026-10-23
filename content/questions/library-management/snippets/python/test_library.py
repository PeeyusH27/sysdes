"""Run from this folder:  python3 -m unittest test_library"""
import threading
import unittest

from fines import CappedFine, GraceFine, PerDayFine
from library import Library
from models import BookItem, ItemState, MemberType


def make():
    lib = Library()
    lib.add_book("111", "Dune", "Frank Herbert", 1)
    lib.add_book("222", "Emma", "Jane Austen", 3)
    for m in ("ann", "bob", "cy"):
        lib.join(m)
    lib.join("pia", MemberType.PREMIUM)
    events = []
    lib.on_event(lambda e: events.append("%s:%s" % (e.type, e.member_id)))
    return lib, events


class LibraryTest(unittest.TestCase):
    def test_a_loan_is_due_after_the_member_types_loan_period(self):
        lib, _ = make()
        self.assertEqual(lib.borrow("ann", "222", 10).value.due, 24)
        self.assertEqual(lib.borrow("pia", "222", 10).value.due, 31)

    def test_a_standard_member_may_hold_3_loans_a_premium_member_5(self):
        lib, _ = make()
        lib.add_book("333", "Ulysses", "James Joyce", 9)
        self.assertEqual([lib.borrow("ann", "333", 1).reason for _ in range(4)], [None, None, None, "LIMIT_REACHED"])
        self.assertEqual([lib.borrow("pia", "333", 1).ok for _ in range(6)], [True] * 5 + [False])

    def test_with_no_free_copy_a_borrow_fails_and_returning_frees_it(self):
        lib, _ = make()
        loan = lib.borrow("ann", "111", 1).value
        self.assertEqual(lib.borrow("bob", "111", 1).reason, "NO_COPY")
        lib.return_item(loan.id, 5)
        self.assertTrue(lib.borrow("bob", "111", 5).ok)

    def test_fines_free_on_time_per_day_when_late_capped_and_cheaper_for_premium(self):
        lib, _ = make()
        a = lib.borrow("ann", "222", 0).value
        b = lib.borrow("ann", "222", 0).value
        c = lib.borrow("pia", "222", 0).value
        self.assertEqual(lib.return_item(a.id, 14).value, 0)
        self.assertEqual(lib.return_item(b.id, 18).value, 100)
        self.assertEqual(lib.return_item(c.id, 25).value, 40)
        d = lib.borrow("ann", "222", 0).value
        self.assertEqual(lib.return_item(d.id, 14 + 90).value, 1000)

    def test_fine_policies_compose(self):
        policy = GraceFine(CappedFine(PerDayFine(50), 200), 2)
        self.assertEqual([policy.fine(d) for d in (0, 2, 3, 5, 20)], [0, 0, 50, 150, 200])

    def test_reservations_are_first_come_first_served_and_the_returned_copy_is_held(self):
        lib, events = make()
        loan = lib.borrow("ann", "111", 1).value
        self.assertEqual(lib.reserve("bob", "111").value, 1)
        self.assertEqual(lib.reserve("cy", "111").value, 2)
        self.assertEqual(lib.reserve("bob", "111").reason, "ALREADY_WAITING")
        lib.return_item(loan.id, 3)
        self.assertIn("ready:bob", events)
        self.assertEqual(lib.borrow("cy", "111", 3).reason, "NO_COPY")
        self.assertTrue(lib.borrow("bob", "111", 3).ok)

    def test_you_cannot_reserve_a_title_that_has_a_free_copy(self):
        lib, _ = make()
        self.assertEqual(lib.reserve("ann", "222").reason, "COPY_AVAILABLE")

    def test_an_unclaimed_hold_lapses_after_3_days_and_passes_to_the_next_member(self):
        lib, events = make()
        loan = lib.borrow("ann", "111", 1).value
        lib.reserve("bob", "111")
        lib.reserve("cy", "111")
        lib.return_item(loan.id, 2)
        lib.sweep(5)
        self.assertNotIn("holdExpired:bob", events)
        lib.sweep(6)
        self.assertIn("holdExpired:bob", events)
        self.assertIn("ready:cy", events)
        self.assertTrue(lib.borrow("cy", "111", 6).ok)

    def test_renewing_twice_at_most_never_when_overdue_never_when_someone_is_waiting(self):
        lib, _ = make()
        loan = lib.borrow("ann", "222", 0).value
        self.assertEqual(lib.renew(loan.id, 10).value, 28)
        self.assertEqual(lib.renew(loan.id, 20).value, 42)
        self.assertEqual(lib.renew(loan.id, 30).reason, "RENEWAL_LIMIT")
        late = lib.borrow("bob", "222", 0).value
        self.assertEqual(lib.renew(late.id, 15).reason, "OVERDUE")
        one = lib.borrow("cy", "111", 0).value
        lib.reserve("bob", "111")
        self.assertEqual(lib.renew(one.id, 5).reason, "RESERVED_BY_OTHERS")

    def test_an_overdue_notice_is_sent_once_per_loan(self):
        lib, events = make()
        lib.borrow("ann", "222", 0)
        for day in (14, 15, 16):
            lib.sweep(day)
        self.assertEqual([e for e in events if e.startswith("overdue")], ["overdue:ann"])

    def test_a_copy_cannot_skip_states(self):
        item = BookItem("x#1", "x")
        with self.assertRaises(ValueError):
            item.move_to(ItemState.HELD)
        with self.assertRaises(ValueError):
            item.move_to(ItemState.LOST)
        item.move_to(ItemState.LOANED)
        item.move_to(ItemState.LOST)
        with self.assertRaises(ValueError):
            item.move_to(ItemState.AVAILABLE)

    def test_search_matches_isbn_exactly_and_title_or_author_in_any_case(self):
        lib, _ = make()
        self.assertEqual(lib.search("222"), ["222"])
        self.assertEqual(lib.search("dune"), ["111"])
        self.assertEqual(lib.search("AUSTEN"), ["222"])
        self.assertEqual(lib.search("nothing"), [])

    def test_8_threads_race_for_the_last_copy_and_exactly_one_gets_it(self):
        for _ in range(100):
            lib = Library()
            lib.add_book("111", "Dune", "Frank Herbert", 1)
            for m in range(8):
                lib.join("m%d" % m)
            go, wins = threading.Event(), []

            def work(member):
                go.wait()
                wins.append(lib.borrow(member, "111", 1).ok)

            threads = [threading.Thread(target=work, args=("m%d" % m,)) for m in range(8)]
            for t in threads:
                t.start()
            go.set()
            for t in threads:
                t.join()
            self.assertEqual(sum(wins), 1)


if __name__ == "__main__":
    unittest.main()
