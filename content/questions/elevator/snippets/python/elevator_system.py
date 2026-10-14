import threading
from typing import Dict, List, Optional

from dispatcher import DispatchStrategy
from elevator_car import ElevatorCar
from models import Dir, Emitter, HallCall


class ElevatorSystem(Emitter):
    """The controller. In Node, panels and the clock post to one event loop and each press runs
    to completion. Here every panel and the clock may be its own thread, so each public method
    holds one lock: two panels can never hand the same hall call to two cars. It is an RLock
    because listeners run inside it and may press a button themselves."""

    def __init__(self, floors: int, cars: int, strategy: DispatchStrategy, door_ticks: int = 2):
        super().__init__()
        self.floors, self.strategy = floors, strategy
        self.cars = [ElevatorCar("ABCDEFGH"[i], floors, door_ticks=door_ticks) for i in range(cars)]
        self.assigned: Dict[HallCall, str] = {}  # call -> car id: exactly one owner per call
        self.waiting: List[HallCall] = []  # calls no car can take yet, oldest first
        self._lock = threading.RLock()

    def car(self, car_id: str) -> ElevatorCar:
        for car in self.cars:
            if car.id == car_id:
                return car
        raise LookupError(f"Unknown car {car_id}")

    def owner(self, call: HallCall) -> Optional[str]:
        return self.assigned.get(call)

    def hall_call(self, floor: int, d: Dir) -> Optional[str]:
        top = self.floors - 1
        no_button = (d is Dir.UP and floor == top) or (d is Dir.DOWN and floor == 0)
        if not 0 <= floor <= top or no_button:
            raise ValueError(f"No {d.value} button at floor {floor}")
        call = HallCall(floor, d)
        with self._lock:
            if call in self.assigned or call in self.waiting:  # pressing ▲ twice is still one call
                return self.owner(call)
            car_id = self._assign(call)
            if car_id is None:
                self.waiting.append(call)
                self.emit("queued", call)
            return car_id

    def car_call(self, car_id: str, floor: int) -> None:
        with self._lock:
            self.car(car_id).add_stop(floor)

    def tick(self) -> None:
        with self._lock:
            for car in self.cars:
                stop = car.step()
                if stop is None:
                    continue
                call = HallCall(stop.floor, stop.dir)
                if self.owner(call) == car.id:
                    del self.assigned[call]
                    self.emit("cleared", call, car.id)  # the hall lamp goes dark
                self.emit("arrived", stop)  # displays and hall lanterns observe this
            self.waiting = [call for call in self.waiting if self._assign(call) is None]

    def take_out_of_service(self, car_id: str) -> None:
        with self._lock:
            self.car(car_id).take_out_of_service()
            orphans = [call for call, owner in self.assigned.items() if owner == car_id]
            for call in orphans:
                del self.assigned[call]
            stranded = [call for call in orphans if self._assign(call) is None]  # no car can take it now
            self.waiting = stranded + self.waiting  # they were pressed first

    def return_to_service(self, car_id: str) -> None:
        with self._lock:
            self.car(car_id).return_to_service()

    def _assign(self, call: HallCall) -> Optional[str]:
        car = self.strategy.pick(call, [c for c in self.cars if c.in_service])
        if car is None:
            return None
        car.add_stop(call.floor, call.dir)
        self.emit("assigned", call, car.id)
        if call.floor in car.stops(call.dir):
            self.assigned[call] = car.id
        else:
            self.emit("cleared", call, car.id)  # the car was already here and opened on the spot
        return car.id
