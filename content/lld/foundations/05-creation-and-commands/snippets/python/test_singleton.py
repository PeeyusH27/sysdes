import unittest

from singleton_before import TicketNumbers as GlobalNumbers, issue_ticket
from singleton_after import TicketNumbers, TicketOffice


class FakeNumbers:
    def next(self):
        return 99


class SingletonTest(unittest.TestCase):
    def test_before_every_caller_shares_one_counter(self):
        self.assertIs(GlobalNumbers.get(), GlobalNumbers.get())

    def test_before_state_leaks_from_one_caller_to_the_next(self):
        first = issue_ticket("car")["number"]
        second = GlobalNumbers.get().next()
        self.assertEqual(second, first + 1)

    def test_after_each_office_starts_from_its_own_fresh_counter(self):
        a = TicketOffice(TicketNumbers())
        b = TicketOffice(TicketNumbers())
        self.assertEqual(a.issue("car")["number"], 1)
        self.assertEqual(a.issue("bike")["number"], 2)
        self.assertEqual(b.issue("car")["number"], 1)

    def test_after_a_test_can_pass_a_fake_in(self):
        office = TicketOffice(FakeNumbers())
        self.assertEqual(office.issue("car"), {"vehicle": "car", "number": 99})

    def test_after_sharing_is_still_possible_on_purpose(self):
        numbers = TicketNumbers()
        gate_a = TicketOffice(numbers)
        gate_b = TicketOffice(numbers)
        self.assertEqual(gate_a.issue("car")["number"], 1)
        self.assertEqual(gate_b.issue("car")["number"], 2)


if __name__ == "__main__":
    unittest.main()
