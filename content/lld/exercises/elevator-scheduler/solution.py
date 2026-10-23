OPPOSITE = {"up": "down", "down": "up"}


class LookPolicy:
    """Strategy: a policy decides two things only, 'stop here?' and 'which way next?'."""

    def serve(self, car):
        here = [s for s in car.stops if s[0] == car.floor]
        if not here:
            return False
        if car.dir is None:  # idle: take everything at this floor
            car.clear_where(lambda s: s[0] == car.floor)
            return True
        d = car.dir
        wanted = any(kind == "car" or kind == d for _, kind in here)
        turn = (not car.has_stop_ahead(d)) and any(kind == OPPOSITE[d] for _, kind in here)  # last stop of the sweep
        if not wanted and not turn:
            return False
        car.clear_where(lambda s: s[0] == car.floor and (turn or s[1] == "car" or s[1] == d))
        if turn:
            car.dir = OPPOSITE[d]
        return True

    def heading(self, car):
        if not car.stops:
            return None
        if car.dir is None:
            nearest = min((s[0] for s in car.stops), key=lambda f: (abs(f - car.floor), f))
            return "up" if nearest > car.floor else "down"
        return car.dir if car.has_stop_ahead(car.dir) else OPPOSITE[car.dir]


class FcfsPolicy:
    def serve(self, car):
        if not car.stops or car.stops[0][0] != car.floor:
            return False
        car.clear_where(lambda s: s[0] == car.floor)
        return True

    def heading(self, car):
        if not car.stops:
            return None
        return "up" if car.stops[0][0] > car.floor else "down"


# Adding a policy is one line here; ElevatorController never changes.
POLICIES = {"look": LookPolicy, "fcfs": FcfsPolicy}


class ElevatorController:
    def __init__(self, floors, start, policy):
        self.floors = floors
        self.floor = start
        self.policy = POLICIES[policy]()
        self.stops = []  # pending calls in request order: (floor, kind) with kind 'up', 'down' or 'car'
        self.dir = None  # the sweep direction
        self.status = "IDLE@%d" % start

    def _add(self, floor, kind):
        if not isinstance(floor, int) or isinstance(floor, bool) or floor < 0 or floor >= self.floors:
            return False
        if (floor, kind) in self.stops:
            return False
        self.stops.append((floor, kind))
        return True

    def hall_call(self, floor, dir):
        if dir not in ("up", "down"):
            return False
        if (dir == "up" and floor == self.floors - 1) or (dir == "down" and floor == 0):
            return False
        return self._add(floor, dir)

    def car_call(self, floor):
        return self._add(floor, "car")

    def tick(self):
        # Doors close for free at the start of any tick.
        if self.policy.serve(self):
            self.status = "OPEN@%d" % self.floor
            return self.status
        heading = self.policy.heading(self)
        self.dir = heading
        if heading is None:
            self.status = "IDLE@%d" % self.floor
            return self.status
        self.floor += 1 if heading == "up" else -1
        if self.policy.serve(self):
            self.status = "OPEN@%d" % self.floor
        else:
            self.status = "%s@%d" % (heading.upper(), self.floor)
        return self.status

    def state(self):
        return self.status

    def pending(self):
        return [[f, k] for f, k in sorted(self.stops)]

    # ---- helpers the policies use
    def has_stop_ahead(self, d):
        return any((f > self.floor) if d == "up" else (f < self.floor) for f, _ in self.stops)

    def clear_where(self, test):
        self.stops = [s for s in self.stops if not test(s)]
