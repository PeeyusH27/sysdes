"""Run from this folder:  python3 -m unittest test_parking_lot"""
import threading
import unittest
from datetime import datetime, timedelta, timezone

from floor import Floor
from models import FITS, Spot, SpotType, Vehicle, VehicleType
from parking_lot import ParkingLot, Receipt
from strategies import DailyCap, HourlyPricing, LowestFloorFirst

START = datetime(2024, 1, 1, tzinfo=timezone.utc)
CAR = Vehicle(VehicleType.CAR, "KA03")


class TestClock:
    """A clock the test moves by hand."""

    def __init__(self):
        self.now = START

    def __call__(self) -> datetime:
        return self.now

    def set(self, since_start: timedelta) -> None:
        self.now = START + since_start


def make_lot(clock):
    floors = [
        Floor(0, [Spot("0-C1", SpotType.COMPACT, 0), Spot("0-L1", SpotType.LARGE, 0)]),
        Floor(1, [Spot("1-B1", SpotType.BIKE, 1)]),
    ]
    return ParkingLot(floors, LowestFloorFirst(), HourlyPricing(), clock), floors


class ParkingLotTest(unittest.TestCase):
    def test_trucks_take_large_spots_and_fees_round_up_per_started_hour(self):
        clock = TestClock()
        lot, floors = make_lot(clock)
        t = lot.park(Vehicle(VehicleType.TRUCK, "KA01AB1234"))
        self.assertEqual(t.spot.id, "0-L1")
        with self.assertRaisesRegex(RuntimeError, "Lot full"):
            lot.park(Vehicle(VehicleType.TRUCK, "KA02"))
        clock.set(timedelta(minutes=61))  # 61 minutes = 2 started hours × 40
        self.assertEqual(lot.exit(t.id, 100), Receipt(fee=80, change=20))
        self.assertEqual(floors[0].available(SpotType.LARGE), 1)

    def test_grace_period_and_daily_cap(self):
        pricing = DailyCap(HourlyPricing(), 150)
        self.assertEqual(pricing.fee(timedelta(minutes=5), CAR), 0)
        self.assertEqual(pricing.fee(timedelta(hours=23), CAR), 150)
        self.assertEqual(pricing.fee(timedelta(hours=26), CAR), 190)  # 1 day capped + 2 hours

    def test_display_boards_hear_about_every_change(self):
        lot, _ = make_lot(TestClock())
        changed = []
        lot.on_change(changed.append)
        lot.exit(lot.park(CAR).id, 0)
        self.assertEqual(changed, [0, 0])

    def test_exact_hour_boundaries(self):
        pricing, ms = HourlyPricing(), timedelta(milliseconds=1)
        self.assertEqual(pricing.fee(timedelta(minutes=10), CAR), 0)  # the grace period is inclusive
        self.assertEqual(pricing.fee(timedelta(minutes=10) + ms, CAR), 20)
        self.assertEqual(pricing.fee(timedelta(minutes=60), CAR), 20)
        self.assertEqual(pricing.fee(timedelta(minutes=60) + ms, CAR), 40)

    def test_unknown_tickets_short_payments_and_double_exits_are_rejected(self):
        clock = TestClock()
        lot, floors = make_lot(clock)
        with self.assertRaisesRegex(LookupError, "Unknown ticket"):
            lot.quote("nope")
        t = lot.park(CAR)
        clock.set(timedelta(hours=2))  # 2 hours × 20
        self.assertEqual(lot.quote(t.id), 40)
        with self.assertRaisesRegex(ValueError, "Payment of 40 required"):
            lot.exit(t.id, 30)
        self.assertEqual(floors[0].available(SpotType.COMPACT), 0)  # a failed payment keeps the spot taken
        self.assertEqual(lot.exit(t.id, 40), Receipt(fee=40, change=0))
        with self.assertRaisesRegex(LookupError, "Unknown ticket"):
            lot.exit(t.id, 40)

    def test_smallest_fitting_type_first_then_next_floor_and_ev_filter(self):
        ev = Spot("1-C1", SpotType.COMPACT, 1, {"ev"})
        floors = [
            Floor(0, [Spot("0-C1", SpotType.COMPACT, 0), Spot("0-L1", SpotType.LARGE, 0)]),
            Floor(1, [ev, Spot("1-B1", SpotType.BIKE, 1)]),
        ]
        choose = LowestFloorFirst().choose
        self.assertEqual(choose(floors, Vehicle(VehicleType.CAR, needs_charger=True), FITS).id, "1-C1")
        self.assertEqual(choose(floors, Vehicle(VehicleType.BIKE), FITS).id, "0-C1")  # no bike spot on 0
        self.assertEqual(choose(floors, Vehicle(VehicleType.CAR), FITS).id, "0-L1")  # compact gone: large fits
        self.assertIsNone(choose(floors, Vehicle(VehicleType.CAR), FITS))  # floor 1: no compact or large left

    def test_80_cars_at_8_gates_never_share_one_of_50_spots(self):
        spots = [Spot(f"0-C{i}", SpotType.COMPACT, 0) for i in range(50)]
        lot = ParkingLot([Floor(0, spots)], LowestFloorFirst(), HourlyPricing(), TestClock())
        go, taken, full = threading.Barrier(8), [], []

        def gate(n: int) -> None:
            go.wait()  # all gates press at once
            for i in range(10):
                try:
                    taken.append(lot.park(Vehicle(VehicleType.CAR, f"G{n}-{i}")).spot.id)
                except RuntimeError:
                    full.append(n)

        threads = [threading.Thread(target=gate, args=(n,)) for n in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(len(taken), 50)
        self.assertEqual(len(set(taken)), 50)
        self.assertEqual(len(full), 30)


if __name__ == "__main__":
    unittest.main()
