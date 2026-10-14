from abc import ABC, abstractmethod
from typing import List, Optional

from elevator_car import ElevatorCar
from models import Dir, HallCall


def route_distance(car: ElevatorCar, floor: int, d: Dir) -> int:
    """Floors the car travels along its LOOK sweep before it can open at `floor` heading `d`."""
    here = car.floor
    if car.dir is None:  # idle
        return abs(here - floor)
    stops = car.all_stops()
    top, bottom = max([here, *stops]), min([here, *stops])
    on_the_way = (floor - here) * car.dir.sign > 0 or (floor == here and not car.moving)
    if d is car.dir and on_the_way:  # ahead, same direction
        return abs(floor - here)
    if car.dir is Dir.UP:
        if d is Dir.DOWN:
            turn = max(top, floor)
            return turn - here + (turn - floor)
        low = min(bottom, floor)
        return top - here + (top - low) + (floor - low)  # up, all the way down, back up
    if d is Dir.UP:
        turn = min(bottom, floor)
        return here - turn + (floor - turn)
    high = max(top, floor)
    return here - bottom + (high - bottom) + (high - floor)


class DispatchStrategy(ABC):
    """pick(call, cars) returns a car, or None to leave the call waiting."""

    @abstractmethod
    def pick(self, call: HallCall, cars: List[ElevatorCar]) -> Optional[ElevatorCar]: ...


class NearestCar(DispatchStrategy):
    """Nearest car, direction-aware: route distance plus a penalty for every stop made first."""

    def __init__(self, stop_cost: int = 2):  # a stop costs about 2 floors of travel
        self.stop_cost = stop_cost

    def cost(self, car: ElevatorCar, call: HallCall) -> int:
        dist = route_distance(car, call.floor, call.dir)
        before = sum(1 for d in Dir for f in car.stops(d) if route_distance(car, f, d) < dist)
        return dist + self.stop_cost * before

    def pick(self, call, cars):
        best, best_cost = None, float("inf")
        for car in cars:
            c = self.cost(car, call)
            if c < best_cost:  # ties go to the first car
                best, best_cost = car, c
        return best


class Collective(DispatchStrategy):
    """Only an idle car, or one already sweeping past the floor in the call's direction,
    takes the call. Otherwise it waits and the system retries every tick."""

    def pick(self, call, cars):
        def passing(car: ElevatorCar) -> bool:
            return car.dir is call.dir and (call.floor - car.floor) * call.dir.sign > 0

        fits = [car for car in cars if car.idle or passing(car)]
        return min(fits, key=lambda car: abs(car.floor - call.floor), default=None)  # ties: first car
