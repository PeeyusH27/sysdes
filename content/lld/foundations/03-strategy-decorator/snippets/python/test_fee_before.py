import unittest

from fee_before import parking_fee


def stay(minutes, enter_hour, vehicle):
    return {"minutes": minutes, "enter_hour": enter_hour, "vehicle": vehicle}


class FeeBeforeTest(unittest.TestCase):
    def test_charges_every_started_hour_at_the_vehicle_rate(self):
        self.assertEqual(parking_fee(stay(61, 12, "bike")), 20)
        self.assertEqual(parking_fee(stay(60, 12, "car")), 20)
        self.assertEqual(parking_fee(stay(120, 12, "truck")), 80)

    def test_grace_period_night_discount_and_cap_follow_the_order_of_the_ifs(self):
        self.assertEqual(parking_fee(stay(10, 12, "car")), 0)
        self.assertEqual(parking_fee(stay(480, 23, "car")), 80)   # 160, halved, under the cap
        self.assertEqual(parking_fee(stay(480, 12, "car")), 100)  # 160, capped


if __name__ == "__main__":
    unittest.main()
