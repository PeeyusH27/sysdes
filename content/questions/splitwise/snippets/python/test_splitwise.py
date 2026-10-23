"""Run from this folder:  python3 -m unittest test_splitwise"""
import random
import threading
import unittest

from group import Group
from splits import SPLITS


def trip():
    return Group(["ana", "ben", "cam", "dee"])


class SplitwiseTest(unittest.TestCase):
    def test_an_equal_split_the_payer_is_owed_everyone_elses_share(self):
        g = trip()
        r = g.add_expense("ana", 3000, "equal", ["ana", "ben", "cam"])
        self.assertEqual(r["shares"], {"ana": 1000, "ben": 1000, "cam": 1000})
        self.assertEqual((g.owes("ben", "ana"), g.owes("ana", "ben")), (1000, 0))
        self.assertEqual(g.balances(), {"ben": -1000, "ana": 2000, "cam": -1000})

    def test_leftover_cents_go_to_the_first_participants_one_each_in_the_order_given(self):
        self.assertEqual(SPLITS["equal"](1000, ["a", "b", "c"]), [334, 333, 333])
        self.assertEqual(SPLITS["equal"](1001, ["a", "b", "c"]), [334, 334, 333])
        self.assertEqual(SPLITS["equal"](1001, ["c", "a", "b"]), [334, 334, 333])

    def test_exact_shares_must_add_up_to_the_amount(self):
        self.assertEqual(SPLITS["exact"](2000, ["a", "b"], [500, 1500]), [500, 1500])
        self.assertIsNone(SPLITS["exact"](2000, ["a", "b"], [500, 1400]))
        self.assertIsNone(SPLITS["exact"](2000, ["a", "b"], [-100, 2100]))

    def test_percent_whole_percents_that_add_to_100_with_the_remainder_rule(self):
        self.assertEqual(SPLITS["percent"](1001, ["a", "b", "c"], [50, 30, 20]), [501, 300, 200])
        self.assertIsNone(SPLITS["percent"](1001, ["a", "b"], [50, 40]))
        self.assertIsNone(SPLITS["percent"](1000, ["a", "b"], [100, 0]))

    def test_shares_proportional_to_the_weights(self):
        self.assertEqual(SPLITS["shares"](1001, ["a", "b", "c"], [2, 1, 1]), [501, 250, 250])
        self.assertIsNone(SPLITS["shares"](1000, ["a", "b"], [1, 0]))

    def test_every_split_hands_out_exactly_the_amount_for_500_random_bills(self):
        rnd = random.Random(11)
        for _ in range(500):
            n, amount = 1 + rnd.randrange(6), 1 + rnd.randrange(100000)
            users = [f"u{k}" for k in range(n)]
            self.assertEqual(sum(SPLITS["equal"](amount, users)), amount)
            self.assertEqual(sum(SPLITS["shares"](amount, users, [1 + rnd.randrange(5) for _ in users])), amount)

    def test_bad_expenses_are_rejected_and_change_nothing(self):
        g = trip()
        bad = [
            ("zed", 100, "equal", ["ana"]), ("ana", 100, "equal", ["ana", "zed"]), ("ana", 100, "equal", ["ana", "ana"]),
            ("ana", 100, "equal", []), ("ana", 0, "equal", ["ana"]), ("ana", 10.5, "equal", ["ana"]),
            ("ana", 100, "weird", ["ana"]),
        ]
        for payer, amount, kind, users in bad:
            self.assertFalse(g.add_expense(payer, amount, kind, users)["ok"], (payer, amount, kind, users))
        self.assertFalse(g.add_expense("ana", 100, "exact", ["ana", "ben"], [50, 49])["ok"])
        self.assertEqual((len(g.expenses), g.balances()), (0, {}))

    def test_debts_between_a_pair_are_netted_both_ways(self):
        g = trip()
        g.add_expense("ana", 1000, "equal", ["ana", "ben"])  # ben owes ana 500
        g.add_expense("ben", 300, "equal", ["ana", "ben"])  # ana owes ben 150
        self.assertEqual((g.owes("ben", "ana"), g.owes("ana", "ben")), (350, 0))

    def test_repeated_expenses_between_the_same_pair_add_up(self):
        g = trip()
        for _ in range(3):
            g.add_expense("ana", 1000, "equal", ["ana", "ben"])
        self.assertEqual(g.owes("ben", "ana"), 1500)
        g.add_expense("ben", 4000, "equal", ["ana", "ben"])  # ana owes ben 2000, which cancels 1500
        self.assertEqual((g.owes("ana", "ben"), g.owes("ben", "ana")), (500, 0))

    def test_settling_reduces_the_debt_and_never_more_than_is_owed(self):
        g = trip()
        g.add_expense("ana", 1000, "equal", ["ana", "ben"])
        self.assertTrue(g.settle_up("ben", "ana", 200)["ok"])
        self.assertEqual(g.owes("ben", "ana"), 300)
        self.assertFalse(g.settle_up("ben", "ana", 400)["ok"])  # would overpay
        self.assertFalse(g.settle_up("ana", "ben", 1)["ok"])  # ana owes nothing
        self.assertTrue(g.settle_up("ben", "ana", 300)["ok"])
        self.assertEqual(g.balances(), {"ben": 0, "ana": 0})

    def test_simplify_a_owes_b_and_b_owes_c_becomes_a_pays_c(self):
        g = trip()
        g.add_expense("ben", 1000, "exact", ["ana"], [1000])  # ana owes ben 1000
        g.add_expense("cam", 1000, "exact", ["ben"], [1000])  # ben owes cam 1000
        self.assertEqual(g.simplify(), [("ana", "cam", 1000)])

    def test_simplify_ties_break_by_name(self):
        g = trip()
        g.add_expense("dee", 4000, "equal", ["ana", "ben", "cam", "dee"])
        self.assertEqual(g.simplify(), [("ana", "dee", 1000), ("ben", "dee", 1000), ("cam", "dee", 1000)])

    def test_simplify_a_messy_trip_settles_to_zero_in_at_most_n_minus_1_transfers(self):
        g = Group(["ana", "ben", "cam", "dee", "eve"])
        g.add_expense("ana", 4500, "equal", ["ana", "ben", "cam"])
        g.add_expense("ben", 1200, "exact", ["cam", "dee"], [700, 500])
        g.add_expense("cam", 3333, "percent", ["ana", "ben", "cam", "dee"], [10, 20, 30, 40])
        g.add_expense("eve", 999, "equal", ["ana", "ben", "cam", "dee", "eve"])
        net = g.balances()
        self.assertEqual(sum(net.values()), 0)
        plan = g.simplify()
        for source, to, cents in plan:
            net[source] += cents
            net[to] -= cents
        self.assertTrue(all(v == 0 for v in net.values()))
        self.assertLessEqual(len(plan), 4)

    def test_listeners_hear_about_expenses_and_settlements(self):
        g = trip()
        seen = []
        g.on(lambda e: seen.append(e["type"]))
        g.add_expense("ana", 100, "equal", ["ana", "ben"])
        g.add_expense("ana", 0, "equal", ["ana"])
        g.settle_up("ben", "ana", 50)
        self.assertEqual(seen, ["expense", "settled"])

    def test_8_threads_settle_the_same_500_debt_in_100s_exactly_five_succeed(self):
        g = trip()
        g.add_expense("ana", 1000, "equal", ["ana", "ben"])
        ok = []
        threads = [threading.Thread(target=lambda: ok.append(g.settle_up("ben", "ana", 100)["ok"])) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual((sum(ok), g.owes("ben", "ana")), (5, 0))

    def test_8_threads_add_800_expenses_and_the_books_still_add_up_to_zero(self):
        g = Group(["ana", "ben", "cam"])

        def work():
            for _ in range(100):
                g.add_expense("ana", 1001, "equal", ["ana", "ben", "cam"])

        threads = [threading.Thread(target=work) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        net = g.balances()
        self.assertEqual(len(g.expenses), 800)
        self.assertEqual((net["ben"], net["cam"]), (-800 * 334, -800 * 333))
        self.assertEqual(sum(net.values()), 0)


if __name__ == "__main__":
    unittest.main()
