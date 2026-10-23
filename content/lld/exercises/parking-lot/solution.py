SIZE = {"bike": 0, "compact": 1, "large": 2}
FITS = {"bike": ("bike", "compact", "large"), "car": ("compact", "large"), "truck": ("large",)}

# Seam 1, spot choice: a policy is a sort key. The free spot with the smallest key wins, so a new policy is one new entry.
SPOT_POLICIES = {
    "smallest-first": lambda s: (SIZE[s["type"]], s["floor"], s["index"]),
    "lowest-floor-first": lambda s: (s["floor"], SIZE[s["type"]], s["index"]),
}

# Seam 2, pricing: a policy turns (vehicle, minutes) into cents. ParkingLot never sees a rate.
HOURLY = {"bike": 100, "car": 200, "truck": 500}
FLAT = {"bike": 300, "car": 500, "truck": 1200}


def hourly(vehicle, minutes):
    return 0 if minutes <= 10 else -(-minutes // 60) * HOURLY[vehicle]


def flat(vehicle, minutes):
    return FLAT[vehicle]


PRICING = {"hourly": hourly, "flat": flat}


class ParkingLot:
    def __init__(self, floors):
        # Each spot remembers where it is and whether someone is in it.
        self.spots = [
            {"floor": f, "index": i, "type": t, "taken": False}
            for f, types in enumerate(floors)
            for i, t in enumerate(types)
        ]
        self.tickets = {}  # ticket id -> (plate, vehicle, spot) while the vehicle is inside
        self.plates = set()
        self.next_id = 1
        self.spot_key = SPOT_POLICIES["smallest-first"]
        self.price = PRICING["hourly"]

    def use_spot_policy(self, name):
        if name not in SPOT_POLICIES:
            return False
        self.spot_key = SPOT_POLICIES[name]
        return True

    def use_pricing(self, name):
        if name not in PRICING:
            return False
        self.price = PRICING[name]
        return True

    def park(self, plate, vehicle):
        if vehicle not in FITS or plate in self.plates:
            return -1
        free = [s for s in self.spots if not s["taken"] and s["type"] in FITS[vehicle]]
        if not free:
            return -1
        best = min(free, key=self.spot_key)
        best["taken"] = True
        self.plates.add(plate)
        ticket_id = self.next_id
        self.next_id += 1
        self.tickets[ticket_id] = (plate, vehicle, best)
        return ticket_id

    def leave(self, ticket_id, minutes):
        entry = self.tickets.pop(ticket_id, None)
        if entry is None:
            return -1  # unknown, or already used
        plate, vehicle, spot = entry
        self.plates.discard(plate)
        spot["taken"] = False
        return self.price(vehicle, minutes)

    def available(self, floor, spot_type):
        return sum(1 for s in self.spots if s["floor"] == floor and s["type"] == spot_type and not s["taken"])

    def spot_of(self, ticket_id):
        entry = self.tickets.get(ticket_id)
        return "%d-%d" % (entry[2]["floor"], entry[2]["index"]) if entry else ""
