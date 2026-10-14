from typing import Dict, List, NamedTuple, Optional

from models import CarState, Dir, Stop

MOVING = {CarState.MOVING_UP, CarState.MOVING_DOWN}


class Plan(NamedTuple):
    """What _plan() decides: serve this floor, move one way, or (both None) rest."""
    serve: Optional[Dir] = None
    move: Optional[Dir] = None


class ElevatorCar:
    """One car is a small state machine. Time is an injected tick: one tick moves one floor,
    or counts down the open doors, so tests are deterministic.
    Not thread-safe on its own: ElevatorSystem's lock guards every car."""

    def __init__(self, id: str, floors: int, floor: int = 0, door_ticks: int = 2):
        self.id, self.floors, self.floor, self.door_ticks = id, floors, floor, door_ticks
        self.state = CarState.IDLE
        self.dir: Optional[Dir] = None  # the sweep LOOK is committed to; None when idle
        # Dicts serve as insertion-ordered sets (a set has no order), so ties break as in the JS.
        self.up_stops: Dict[int, None] = {}  # stop here while going up
        self.down_stops: Dict[int, None] = {}  # stop here while going down
        self.door_timer = 0

    @property
    def in_service(self) -> bool:
        return self.state is not CarState.OUT_OF_SERVICE

    @property
    def moving(self) -> bool:
        return self.state in MOVING

    @property
    def idle(self) -> bool:
        return self.state is CarState.IDLE and not self.up_stops and not self.down_stops

    def stops(self, d: Dir) -> Dict[int, None]:
        return self.up_stops if d is Dir.UP else self.down_stops

    def all_stops(self) -> List[int]:
        return [*self.up_stops, *self.down_stops]

    def add_stop(self, floor: int, hall_dir: Optional[Dir] = None) -> None:
        """hall_dir for a hall call; None for a car call (a button inside the car)."""
        if not 0 <= floor < self.floors:
            raise ValueError(f"No floor {floor}")
        if not self.in_service:
            raise RuntimeError(f"Car {self.id} is out of service")
        stopped_here = floor == self.floor and not self.moving
        if stopped_here and (hall_dir is None or self.dir is None or hall_dir is self.dir):
            self.open_doors()
            return
        d = hall_dir
        if d is None:
            if floor != self.floor:
                d = Dir.UP if floor > self.floor else Dir.DOWN
            else:  # passing this floor right now: catch it on the way back
                d = self.dir.opposite
        self.stops(d)[floor] = None

    def open_doors(self) -> None:
        if self.moving:
            raise RuntimeError("Doors stay shut while the car is moving")
        if not self.in_service:
            raise RuntimeError(f"Car {self.id} is out of service")
        self.state = CarState.DOORS_OPEN
        self.door_timer = self.door_ticks  # a door sensor would reset this while the beam is blocked

    def step(self) -> Optional[Stop]:
        """Advance one tick. Returns the stop when the car stops and opens, else None."""
        if not self.in_service:
            return None
        if self.state is CarState.DOORS_OPEN:
            self.door_timer -= 1
            if self.door_timer > 0:
                return None
            self.state = CarState.IDLE  # doors closed: stopped at this floor
        if self.state is CarState.IDLE:
            plan = self._plan()
            if plan.serve is not None:
                return self._stop(plan.serve)
            self.dir = plan.move
            if plan.move is None:
                return None  # nothing to do: stay idle
            self.state = CarState.MOVING_UP if plan.move is Dir.UP else CarState.MOVING_DOWN
        self.floor += 1 if self.state is CarState.MOVING_UP else -1
        if not 0 <= self.floor < self.floors:
            raise RuntimeError("Ran off the end of the shaft")
        plan = self._plan()  # reached a new floor: stop here, keep going, or halt
        if plan.serve is not None:
            return self._stop(plan.serve)
        if plan.move is not self.dir:  # its target was taken away: halt, never reverse in motion
            self.state = CarState.IDLE
            self.dir = plan.move
        return None

    def take_out_of_service(self) -> None:  # a real car first levels at the nearest floor and opens
        self.up_stops.clear()
        self.down_stops.clear()
        self.state = CarState.OUT_OF_SERVICE
        self.dir = None

    def return_to_service(self) -> None:
        self.state = CarState.IDLE

    def _plan(self) -> Plan:
        """LOOK: keep the sweep while any stop lies ahead and serve stops in that direction;
        turn around only when nothing is ahead."""
        stops = self.all_stops()

        def ahead(d: Dir) -> bool:
            return any((f - self.floor) * d.sign > 0 for f in stops)

        def wants(d: Dir) -> bool:
            return self.floor in self.stops(d)

        d = self.dir
        if d is None:  # idle: serve this floor, else head for the nearest stop
            if wants(Dir.UP):
                return Plan(serve=Dir.UP)
            if wants(Dir.DOWN):
                return Plan(serve=Dir.DOWN)
            if not stops:
                return Plan()
            nearest = min(stops, key=lambda f: abs(f - self.floor))  # the first one wins a tie
            d = Dir.UP if nearest > self.floor else Dir.DOWN
        if ahead(d):
            return Plan(serve=d) if wants(d) else Plan(move=d)
        if wants(d):
            return Plan(serve=d)  # last stop of this sweep
        if wants(d.opposite):
            return Plan(serve=d.opposite)  # turn around here
        return Plan(move=d.opposite) if ahead(d.opposite) else Plan()

    def _stop(self, d: Dir) -> Stop:
        self.state = CarState.IDLE  # stopped exactly at this floor, so opening is legal
        self.stops(d).pop(self.floor, None)
        self.dir = d
        self.open_doors()
        return Stop(self.id, self.floor, d)
