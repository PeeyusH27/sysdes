import unittest

from strategy import ByVehicle, FlatRate, Garage, HourlyRate


class StrategyTest(unittest.TestCase):
    def test_hourly_rate_charges_every_started_hour(self):
        car = HourlyRate(20)
        self.assertEqual(car.fee({"minutes": 0}), 0)
        self.assertEqual(car.fee({"minutes": 60}), 20)
        self.assertEqual(car.fee({"minutes": 61}), 40)

    def test_the_garage_uses_whatever_strategy_it_was_given_and_can_be_switched(self):
        garage = Garage(HourlyRate(20))
        self.assertEqual(garage.checkout({"minutes": 180}), 60)
        garage.switch_to(FlatRate(50))
        self.assertEqual(garage.checkout({"minutes": 180}), 50)

    def test_by_vehicle_picks_a_strategy_per_vehicle_and_falls_back_for_the_rest(self):
        pricing = ByVehicle({"bike": HourlyRate(10)}, HourlyRate(20))
        self.assertEqual(pricing.fee({"vehicle": "bike", "minutes": 180}), 30)
        self.assertEqual(pricing.fee({"vehicle": "car", "minutes": 180}), 60)
        self.assertEqual(pricing.fee({"vehicle": "scooter", "minutes": 180}), 60)


if __name__ == "__main__":
    unittest.main()
