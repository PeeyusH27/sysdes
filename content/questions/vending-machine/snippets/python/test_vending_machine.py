"""Run from this folder:  python3 -m unittest test_vending_machine"""
import threading
import unittest

from change import greedy_change, make_change
from models import COINS, Slot
from states import STATES, Event, EventType, State
from vending_machine import Result, VendingMachine

TUBES = {25: 10, 10: 10, 5: 10}  # 250 + 100 + 50 = 400¢


def coin(c):
    return Event(EventType.COIN, coin=c)


def select(code):
    return Event(EventType.SELECT, code=code)


def ev(t):
    return Event(t)


class Rig:
    """A machine plus everything its listeners saw."""

    def __init__(self, coins=None):
        self.m = VendingMachine([Slot("B2", "Cola", 65, 2), Slot("C2", "Pretzels", 85, 0)],
                                TUBES if coins is None else coins)
        self.returned, self.rejected, self.sales, self.paid_out = [], [], [], 0
        self.m.on("returned", self._on_returned)
        self.m.on("rejected", lambda event, state, reason: self.rejected.append(reason))
        self.m.on("sale", lambda code, price: self.sales.append(code))

    def _on_returned(self, coins, why):
        self.returned += coins
        if why != "refused":  # a refused coin never entered the machine
            self.paid_out += sum(coins)

    def stock(self, code=None):
        slots = self.m.inventory.slots
        return slots[code].count if code else sum(s.count for s in slots.values())

    def snapshot(self):
        m = self.m
        return (m.state, list(m.escrow), m.pending, dict(m.box.counts), self.stock("B2"), self.stock("C2"))


def mulberry32(seed):
    """The same deterministic generator as the JS test, on unsigned 32-bit ints."""
    def imul(a, b):
        return (a * b) & 0xFFFFFFFF

    def rand():
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = imul(seed ^ (seed >> 15), 1 | seed)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rand


class VendingMachineTest(unittest.TestCase):
    def test_greedy_fails_with_limited_tubes_and_the_bounded_dp_still_finds_change(self):
        tubes = {100: 0, 25: 1, 10: 3, 5: 0}
        self.assertIsNone(greedy_change(30, tubes))  # takes the 25¢, then needs a 5¢
        self.assertEqual(make_change(30, tubes), [10, 10, 10])
        self.assertIsNone(make_change(15, tubes))  # truly impossible
        self.assertEqual(make_change(0, tubes), [])

    def test_with_plenty_of_coins_greedy_is_already_optimal(self):
        plenty = {100: 9, 25: 9, 10: 9, 5: 9}
        for a in range(0, 301, 5):
            dp = make_change(a, plenty)
            self.assertEqual(sum(dp), a)
            self.assertEqual(len(dp), len(greedy_change(a, plenty)))

    def test_the_dp_returns_the_fewest_coins_and_respects_the_tubes(self):
        tubes = {100: 1, 25: 2, 10: 4, 5: 3}  # 205¢ in total
        for a in range(0, 231, 5):
            ways = [h + q + d + n for h in range(2) for q in range(3) for d in range(5) for n in range(4)
                    if 100 * h + 25 * q + 10 * d + 5 * n == a]  # brute force
            coins = make_change(a, tubes)
            if not ways:
                self.assertIsNone(coins)
                continue
            self.assertEqual(sum(coins), a)
            self.assertEqual(len(coins), min(ways))
            for c in COINS:
                self.assertLessEqual(coins.count(c), tubes[c])

    def test_a_sale_commits_only_after_the_drop_sensor(self):
        r = Rig()
        r.m.send(coin(100))
        self.assertIs(r.m.state, State.HAS_MONEY)
        self.assertEqual(r.m.send(select("B2")), Result(True, State.DISPENSING))
        self.assertEqual(r.m.pending.change, [25, 10])
        self.assertEqual(r.stock("B2"), 2)  # nothing taken yet
        r.m.send(ev(EventType.DROPPED))
        self.assertIs(r.m.state, State.IDLE)
        self.assertEqual(r.returned, [25, 10])
        self.assertEqual(r.sales, ["B2"])
        self.assertEqual(r.stock("B2"), 1)
        self.assertEqual(r.m.box.total(), 400 + 100 - 35)

    def test_every_event_a_state_does_not_list_is_rejected_and_changes_nothing(self):
        events = [coin(25), select("B2"), ev(EventType.CANCEL), ev(EventType.DROPPED),
                  ev(EventType.DROP_FAILED), ev(EventType.SERVICE),
                  Event(EventType.RESTOCK, code="B2", n=1), Event(EventType.REFILL, coins=(5,))]
        reach = {
            State.IDLE: [],
            State.HAS_MONEY: [coin(25)],
            State.DISPENSING: [coin(100), select("B2")],
            State.OUT_OF_SERVICE: [ev(EventType.SERVICE)],
        }
        checked = 0
        for state, path in reach.items():
            for e in events:
                if e.type in STATES[state]:
                    continue
                r = Rig()
                for p in path:
                    r.m.send(p)
                self.assertIs(r.m.state, state)
                before = r.snapshot()
                self.assertFalse(r.m.send(e).ok)
                self.assertEqual(r.snapshot(), before)
                if e.type is EventType.COIN:
                    self.assertEqual(r.returned[-1], 25)  # the refused coin drops to the cup
                checked += 1
        self.assertEqual(checked, 19)  # 32 pairs, 13 accepted

    def test_sold_out_and_short_credit_keep_the_credit_and_cancel_returns_the_same_coins(self):
        r = Rig()
        r.m.send(coin(25))
        r.m.send(coin(25))
        self.assertEqual(r.m.send(select("C2")), Result(False, reason="C2 is sold out"))
        self.assertEqual(r.m.send(select("B2")), Result(False, reason="Insert 15¢ more"))
        self.assertEqual(r.m.credit, 50)
        r.m.send(ev(EventType.CANCEL))
        self.assertIs(r.m.state, State.IDLE)
        self.assertEqual(r.returned, [25, 25])

    def test_no_change_possible_refuses_the_sale_refunds_everything_and_takes_no_stock(self):
        r = Rig({25: 4})  # only quarters: 35¢ can't be paid
        r.m.send(coin(100))
        self.assertEqual(r.m.send(select("B2")), Result(True, State.IDLE))
        self.assertEqual(r.returned, [100])
        self.assertEqual(r.sales, [])
        self.assertEqual(r.stock("B2"), 2)
        self.assertEqual(r.m.box.total(), 100)

    def test_a_failed_drop_refunds_the_escrow_and_takes_no_stock(self):
        r = Rig()
        r.m.send(coin(100))
        r.m.send(select("B2"))
        r.m.send(ev(EventType.DROP_FAILED))
        self.assertIs(r.m.state, State.IDLE)
        self.assertEqual(r.returned, [100])
        self.assertEqual(r.stock("B2"), 2)
        self.assertEqual(r.m.box.total(), 400)

    def test_change_may_come_from_the_coins_just_inserted(self):
        r = Rig({})  # empty tubes
        for c in (25, 25, 10, 10, 5):  # 75¢ for a 65¢ cola
            r.m.send(coin(c))
        self.assertEqual(r.m.send(select("B2")), Result(True, State.DISPENSING))
        self.assertEqual(r.m.pending.change, [10])  # a 10¢ the customer just inserted

    def test_money_is_conserved_and_stock_drops_once_per_sale_over_5000_random_events(self):
        rand = mulberry32(7)

        def pick(xs):
            return xs[int(rand() * len(xs))]

        r = Rig({25: 2, 10: 2, 5: 1})
        opening, inserted, refilled, restocked = r.m.box.total(), 0, 0, 0
        for _ in range(5000):
            e = pick([  # built first, in the JS order, so the same seed replays the same events
                coin(pick([100, 25, 10, 5, 1])), coin(pick([25, 10])),
                select(pick(["B2", "C2"])), ev(EventType.CANCEL), ev(EventType.DROPPED),
                ev(EventType.DROP_FAILED), ev(EventType.SERVICE),
                Event(EventType.RESTOCK, code=pick(["B2", "C2"]), n=2),
                Event(EventType.REFILL, coins=(5, 10)),
            ])
            before = r.stock()
            ok = r.m.send(e).ok
            if ok and e.type is EventType.COIN:
                inserted += e.coin
            if ok and e.type is EventType.REFILL:
                refilled += sum(e.coins)
            if ok and e.type is EventType.RESTOCK:
                restocked += r.stock() - before
            self.assertEqual(r.m.credit + r.m.box.total() + r.paid_out, opening + inserted + refilled)
            self.assertEqual(r.stock(), 2 + restocked - len(r.sales))
            self.assertTrue(all(n >= 0 for n in r.m.box.counts.values()))
        self.assertEqual(len(r.sales), 7)  # the same 7 sales as the JS run

    def test_a_listener_that_sends_mid_transition_is_queued_not_run_inside_it(self):
        r = Rig()

        def instant_sensor(before, after, event_type):
            if after is State.DISPENSING:
                r.m.send(ev(EventType.DROPPED))

        r.m.on("transition", instant_sensor)
        r.m.send(coin(100))
        self.assertEqual(r.m.send(select("B2")), Result(True, State.DISPENSING))
        self.assertIs(r.m.state, State.IDLE)  # dropped ran right after, not inside
        self.assertEqual(r.sales, ["B2"])

    def test_8_coin_threads_at_once_lose_no_coin(self):
        r = Rig()
        go = threading.Barrier(8)

        def feed():
            go.wait()
            for _ in range(100):
                r.m.send(coin(5))

        threads = [threading.Thread(target=feed) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(r.m.credit, 8 * 100 * 5)
        r.m.send(ev(EventType.CANCEL))
        self.assertEqual(r.paid_out, 4000)


if __name__ == "__main__":
    unittest.main()
