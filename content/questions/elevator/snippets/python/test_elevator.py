"""Run from this folder:  python3 -m unittest test_elevator"""
import threading
import unittest

from dispatcher import Collective, NearestCar, route_distance
from elevator_car import ElevatorCar
from elevator_system import ElevatorSystem
from models import CarState, Dir, HallCall, Stop


def run(system, count=float("inf"), ticks=200):
    """Tick until `count` stops happen (or `ticks` ticks), returning "A5▲" for each stop."""
    stops = []

    def on_stop(s):
        stops.append(f"{s.car_id}{s.floor}{s.dir.arrow}")

    system.on("arrived", on_stop)
    for _ in range(ticks):
        if len(stops) >= count:
            break
        system.tick()
    system.off("arrived", on_stop)
    return stops


def one_car():
    return ElevatorSystem(floors=10, cars=1, strategy=NearestCar())


class ElevatorTest(unittest.TestCase):
    def test_look_serves_stops_in_travel_order_and_reverses_only_when_nothing_is_ahead(self):
        system = one_car()
        for f in (5, 2, 7):
            system.car_call("A", f)
        self.assertEqual(run(system, 1), ["A2▲"])
        system.car_call("A", 1)  # behind the car: waits for the way back
        system.car_call("A", 6)  # ahead: joins this sweep
        self.assertEqual(run(system), ["A5▲", "A6▲", "A7▲", "A1▼"])

    def test_hall_calls_are_served_in_their_own_direction(self):
        system = one_car()
        system.car_call("A", 6)
        system.hall_call(3, Dir.UP)
        system.hall_call(4, Dir.DOWN)  # passed on the way up, served on the way down
        self.assertEqual(run(system), ["A3▲", "A6▲", "A4▼"])

    def test_pressing_up_twice_is_one_call_owned_by_exactly_one_car(self):
        system = ElevatorSystem(floors=10, cars=3, strategy=NearestCar())
        assigned = []
        system.on("assigned", lambda call, car: assigned.append(f"{call.key}:{car}"))
        self.assertEqual(system.hall_call(4, Dir.UP), "A")
        self.assertEqual(system.hall_call(4, Dir.UP), "A")
        self.assertEqual(assigned, ["4▲:A"])
        self.assertEqual([c.id for c in system.cars if 4 in c.up_stops], ["A"])

    def test_nearest_car_is_direction_aware(self):
        up = ElevatorCar("A", floors=10, floor=2)
        up.add_stop(5)
        up.dir = Dir.UP  # at 2, sweeping up to 5
        idle = ElevatorCar("B", floors=10, floor=6)
        nc = NearestCar()
        self.assertEqual(route_distance(up, 4, Dir.UP), 2)
        self.assertEqual(nc.cost(up, HallCall(4, Dir.DOWN)), 4 + 2)  # up to 5, back to 4, one stop first
        self.assertEqual(nc.cost(up, HallCall(1, Dir.UP)), 7 + 2)  # a whole round trip
        self.assertEqual(nc.pick(HallCall(4, Dir.DOWN), [up, idle]).id, "B")
        self.assertEqual(nc.pick(HallCall(3, Dir.UP), [up, idle]).id, "A")  # it passes 3 anyway

    def test_collective_call_waits_until_a_car_is_idle_or_sweeping_past_it(self):
        system = ElevatorSystem(floors=10, cars=1, strategy=Collective())
        system.car_call("A", 8)
        system.tick()  # A is now moving up
        self.assertEqual(system.hall_call(5, Dir.UP), "A")  # on its way
        self.assertIsNone(system.hall_call(2, Dir.DOWN))  # behind it, wrong direction: queued
        self.assertEqual([c.key for c in system.waiting], ["2▼"])
        self.assertEqual(run(system), ["A5▲", "A8▲", "A2▼"])  # picked up once A went idle at 8
        self.assertEqual(system.waiting, [])

    def test_a_failed_car_hands_its_hall_calls_to_the_others(self):
        system = ElevatorSystem(floors=10, cars=3, strategy=NearestCar())
        system.cars[1].floor = 4  # B parks at 4, C at 8
        system.cars[2].floor = 8
        self.assertEqual(system.hall_call(5, Dir.DOWN), "B")
        system.take_out_of_service("B")
        self.assertEqual(system.owner(HallCall(5, Dir.DOWN)), "C")
        self.assertNotEqual(system.hall_call(4, Dir.UP), "B")  # never assigned to a car out of service
        cleared = []
        system.on("cleared", lambda call, car: cleared.append(f"{call.key}:{car}"))
        run(system)
        self.assertIn("5▼:C", cleared)
        self.assertIs(system.cars[1].state, CarState.OUT_OF_SERVICE)
        self.assertEqual(system.cars[1].floor, 4)
        system.return_to_service("B")
        system.car_call("B", 7)
        self.assertEqual(run(system), ["B7▲"])  # back in service and moving again

    def test_doors_only_open_when_stopped_and_the_car_never_moves_with_them_open(self):
        car = ElevatorCar("A", floors=10)
        car.add_stop(3)
        car.step()
        self.assertIs(car.state, CarState.MOVING_UP)
        with self.assertRaisesRegex(RuntimeError, "moving"):
            car.open_doors()
        opened = []
        for _ in range(20):
            was_open, before = car.state is CarState.DOORS_OPEN, car.floor
            stop = car.step()
            if was_open:
                self.assertEqual(car.floor, before)  # no tick moves a car whose doors were open
            if car.state is CarState.DOORS_OPEN and car.floor not in opened:
                opened.append(car.floor)
            if stop:
                self.assertEqual(stop, Stop("A", 3, Dir.UP))
        self.assertEqual(opened, [3])
        self.assertIs(car.state, CarState.IDLE)

    def test_floors_outside_the_building_are_rejected_and_cars_stay_inside_it(self):
        system = ElevatorSystem(floors=10, cars=3, strategy=NearestCar())
        self.assertRaises(ValueError, system.car_call, "A", 10)
        self.assertRaises(ValueError, system.hall_call, 9, Dir.UP)
        self.assertRaises(ValueError, system.hall_call, 0, Dir.DOWN)
        seed = 42

        def rand(n):  # a tiny deterministic LCG, as in the JS test
            nonlocal seed
            seed = (seed * 1103515245 + 12345) % 2 ** 31
            return seed % n

        for i in range(2000):
            if i % 3 == 0:
                floor = rand(10)
                system.hall_call(floor, Dir.DOWN if floor == 9 or (floor > 0 and rand(2)) else Dir.UP)
            if i % 7 == 0:
                system.car_call("ABC"[rand(3)], rand(10))
            system.tick()
            for car in system.cars:
                self.assertTrue(0 <= car.floor <= 9)
        run(system, ticks=500)  # drain: no presses, every stop gets served
        self.assertEqual(system.assigned, {})
        self.assertTrue(all(c.idle for c in system.cars))

    def test_8_panels_pressing_at_once_still_make_one_call_per_button(self):
        system = ElevatorSystem(floors=10, cars=3, strategy=NearestCar())
        assigned = []
        system.on("assigned", lambda call, car: assigned.append(call.key))
        go = threading.Barrier(8)

        def panel():
            go.wait()
            for _ in range(100):
                system.hall_call(4, Dir.UP)
                system.hall_call(6, Dir.DOWN)

        threads = [threading.Thread(target=panel) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(sorted(assigned), ["4▲", "6▼"])
        self.assertEqual(sum(4 in c.up_stops for c in system.cars), 1)


if __name__ == "__main__":
    unittest.main()
