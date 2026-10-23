import unittest

from composition_after import Battery, Hybrid, Petrol, Vehicle


class CompositionAfterTest(unittest.TestCase):
    def test_every_vehicle_answers_refill_whatever_it_runs_on(self):
        fleet = [Vehicle("KA01", Petrol()), Vehicle("KA02", Battery())]
        self.assertEqual([v.refill() for v in fleet], ["KA01: petrol in the tank", "KA02: plugged in"])

    def test_a_hybrid_is_a_new_part_not_a_new_branch_of_the_hierarchy(self):
        self.assertEqual(Vehicle("KA03", Hybrid()).refill(), "KA03: petrol in the tank + KA03: plugged in")


if __name__ == "__main__":
    unittest.main()
