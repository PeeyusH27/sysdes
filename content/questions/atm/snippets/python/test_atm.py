"""Run from this folder:  python3 -m unittest test_atm"""
import json
import threading
import unittest

from atm import Atm
from dispenser import build_chain
from models import Account
from states import STATES

FULL = {100: 5, 50: 5, 20: 5, 10: 5}


def make(stock=None, **kw):
    return Atm([Account("ann", "1234", 500), Account("bob", "9999", 40)], FULL if stock is None else stock, **kw)


def login(atm, id="ann", pin="1234"):
    atm.insert_card(id)
    atm.enter_pin(pin)
    return atm


def snapshot(atm):
    return json.dumps([atm.state, atm.card.id if atm.card else None, atm.stock, [a.balance for a in atm.accounts.values()]],
                      sort_keys=True)


class AtmTest(unittest.TestCase):
    def test_a_normal_session_card_pin_withdraw_130_eject(self):
        atm = login(make())
        r = atm.withdraw(130)
        self.assertTrue(r["ok"])
        self.assertEqual(r["notes"], {100: 1, 20: 1, 10: 1})
        self.assertEqual(r["balance"], 370)
        self.assertEqual(atm.stock, {100: 4, 50: 5, 20: 4, 10: 4})
        self.assertEqual(atm.eject()["state"], "idle")

    def test_every_event_a_state_does_not_list_is_rejected_and_changes_nothing(self):
        events = ["insert_card", "enter_pin", "withdraw", "balance", "eject"]
        reach = {"idle": lambda a: a, "card_in": lambda a: (a.insert_card("ann"), a)[1], "authenticated": login}
        for state, table in STATES.items():
            for e in [e for e in events if e not in table]:
                atm = reach[state](make())
                before = snapshot(atm)
                self.assertFalse(atm.send(e, id="ann", pin="1234", amount=10)["ok"], f"{state}.{e}")
                self.assertEqual(snapshot(atm), before, f"{state}.{e}")

    def test_three_wrong_pins_lock_the_account_and_keep_the_card(self):
        atm = make()
        atm.insert_card("ann")
        first = atm.enter_pin("0000")
        self.assertTrue(first["ok"] and not first["authenticated"])
        self.assertEqual(first["attempts_left"], 2)
        self.assertEqual(atm.enter_pin("0001")["attempts_left"], 1)
        third = atm.enter_pin("0002")
        self.assertTrue(third["retained"] and third["state"] == "idle" and not third["authenticated"])
        self.assertEqual(atm.insert_card("ann"), {"ok": False, "reason": "card retained: account locked"})
        self.assertTrue(atm.insert_card("bob")["ok"])  # other cards are unaffected

    def test_a_correct_pin_resets_the_failure_count(self):
        atm = make()
        atm.insert_card("ann")
        atm.enter_pin("0000")
        atm.enter_pin("1234")
        atm.eject()
        atm.insert_card("ann")
        self.assertEqual(atm.enter_pin("0000")["attempts_left"], 2)

    def test_insufficient_funds_rejected_nothing_debited_no_notes_leave(self):
        atm = login(make(), "bob", "9999")
        before = snapshot(atm)
        self.assertEqual(atm.withdraw(50), {"ok": False, "reason": "insufficient funds"})
        self.assertEqual(snapshot(atm), before)

    def test_limited_notes_greedy_would_strand_10_the_chain_backtracks(self):
        stock = {100: 0, 50: 1, 20: 3, 10: 0}
        left = 60
        for d in (100, 50, 20, 10):  # greedy
            left -= min(left // d, stock[d]) * d
        self.assertEqual(left, 10)
        self.assertEqual(build_chain([100, 50, 20, 10]).plan(60, stock), {20: 3})
        self.assertEqual(login(make(stock)).withdraw(60)["notes"], {20: 3})

    def test_an_amount_the_notes_cannot_make_is_rejected_before_any_debit(self):
        atm = login(make({100: 0, 50: 3, 20: 0, 10: 0}))
        self.assertEqual(atm.withdraw(70), {"ok": False, "reason": "cannot dispense that amount"})
        self.assertEqual(atm.balance()["balance"], 500)

    def test_zero_negative_fractional_and_off_unit_amounts_are_invalid(self):
        atm = login(make())
        for amount in (0, -20, 15, 12.5, 7):
            self.assertEqual(atm.withdraw(amount)["reason"], "invalid amount", str(amount))
        self.assertEqual(atm.balance()["balance"], 500)

    def test_a_jammed_cash_unit_refunds_the_debit_and_keeps_the_stock(self):
        atm = login(make(hardware=lambda notes: False))
        self.assertEqual(atm.withdraw(100), {"ok": False, "reason": "dispenser jam: nothing charged"})
        self.assertEqual(atm.balance()["balance"], 500)
        self.assertEqual(atm.stock[100], 5)

    def test_a_new_note_value_is_one_more_handler_in_the_list(self):
        atm = login(make({200: 2, 100: 0, 50: 0, 20: 0, 10: 0}, notes=[200, 100, 50, 20, 10]))
        self.assertEqual(atm.withdraw(400)["notes"], {200: 2})

    def test_listeners_see_accepted_and_rejected_events(self):
        atm = make()
        seen = []
        atm.on(lambda e: seen.append(f"{e['type']}:{e['ok']}"))
        atm.withdraw(10)
        atm.insert_card("ann")
        self.assertEqual(seen, ["withdraw:False", "insert_card:True"])

    def test_8_machines_one_account_with_50_exactly_five_10s_get_out(self):
        shared = Account("ann", "1234", 50)
        paid = []

        def machine():
            atm = login(Atm([shared], {10: 100}))
            for _ in range(3):
                if atm.withdraw(10)["ok"]:
                    paid.append(1)  # list.append is atomic

        threads = [threading.Thread(target=machine) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual((len(paid), shared.balance), (5, 0))


if __name__ == "__main__":
    unittest.main()
