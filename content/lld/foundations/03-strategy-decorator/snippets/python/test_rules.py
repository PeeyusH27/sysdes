import unittest

from rules import Cap, GracePeriod, NightDiscount
from strategy import HourlyRate

car = HourlyRate(20)


class RulesTest(unittest.TestCase):
    def test_grace_period_is_inclusive_exactly_10_minutes_is_free_11_is_a_full_hour(self):
        grace = GracePeriod(car, 10)
        self.assertEqual(grace.fee({"minutes": 10}), 0)
        self.assertEqual(grace.fee({"minutes": 11}), 20)

    def test_night_discount_depends_on_the_hour_of_arrival_22_to_559(self):
        night = NightDiscount(car, 50)
        fees = [night.fee({"minutes": 120, "enter_hour": h}) for h in (21, 22, 23, 5, 6)]
        self.assertEqual(fees, [40, 20, 20, 20, 40])

    def test_night_discount_rounds_halves_up(self):
        self.assertEqual(NightDiscount(HourlyRate(5), 50).fee({"minutes": 60, "enter_hour": 23}), 3)  # 2.5 becomes 3

    def test_cap_stops_the_fee_at_the_maximum_and_leaves_smaller_fees_alone(self):
        capped = Cap(car, 100)
        self.assertEqual(capped.fee({"minutes": 240}), 80)
        self.assertEqual(capped.fee({"minutes": 300}), 100)
        self.assertEqual(capped.fee({"minutes": 480}), 100)


if __name__ == "__main__":
    unittest.main()
