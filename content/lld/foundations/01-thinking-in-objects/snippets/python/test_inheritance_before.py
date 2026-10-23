import unittest

from inheritance_before import Car, ElectricCar, fill_up


class InheritanceBeforeTest(unittest.TestCase):
    def test_code_written_against_car_breaks_when_an_electric_car_is_passed_in(self):
        self.assertEqual(fill_up([Car("KA01")]), ["KA01: petrol in the tank"])
        with self.assertRaisesRegex(RuntimeError, "no tank"):
            fill_up([Car("KA01"), ElectricCar("KA02")])


if __name__ == "__main__":
    unittest.main()
