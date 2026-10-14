from typing import Callable, Dict, Iterable, List, Optional

from models import Spot, SpotType


class Floor:
    """Free spots grouped by type. Not thread-safe on its own: ParkingLot holds its lock while it calls in."""

    def __init__(self, level: int, spots: Iterable[Spot]):
        self.level = level
        # A dict per type is an insertion-ordered set (a plain set has no order),
        # so spots are handed out in a predictable order.
        self.free: Dict[SpotType, Dict[Spot, None]] = {}
        for s in spots:
            self.free.setdefault(s.type, {})[s] = None

    def take(self, types: List[SpotType], accept: Callable[[Spot], bool] = lambda s: True) -> Optional[Spot]:
        for t in types:  # accept() filters on features (e.g. EV chargers)
            bucket = self.free.get(t, {})
            for spot in bucket:
                if accept(spot):
                    del bucket[spot]
                    return spot
        return None

    def release(self, spot: Spot) -> None:
        self.free.setdefault(spot.type, {})[spot] = None

    def available(self, spot_type: SpotType) -> int:
        return len(self.free.get(spot_type, {}))
