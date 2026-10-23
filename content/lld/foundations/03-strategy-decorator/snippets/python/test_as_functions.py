import unittest

from as_functions import capped, hourly, nightly, price


class AsFunctionsTest(unittest.TestCase):
    def test_hourly_charges_every_started_hour(self):
        self.assertEqual(hourly(20)({"minutes": 61}), 40)

    def test_the_composed_price_matches_the_class_version_discount_first_then_cap(self):
        self.assertEqual(price({"minutes": 480, "enter_hour": 23}), 80)
        self.assertEqual(price({"minutes": 480, "enter_hour": 12}), 100)

    def test_wrapping_the_other_way_round_gives_the_other_answer(self):
        other = nightly(capped(hourly(20), 100), 50)
        self.assertEqual(other({"minutes": 480, "enter_hour": 23}), 50)


if __name__ == "__main__":
    unittest.main()
