from abc import ABC, abstractmethod
from datetime import timedelta
from typing import Dict, List, Mapping, Optional

from floor import Floor
from models import SpotType, Spot, Vehicle, VehicleType

HOUR = timedelta(hours=1)
DAY = timedelta(days=1)


# Strategy: the lot asks "which spot?" and "how much?" without knowing the policy.
class SpotSelector(ABC):
    @abstractmethod
    def choose(self, floors: List[Floor], vehicle: Vehicle,
               fits: Mapping[VehicleType, List[SpotType]]) -> Optional[Spot]: ...


class PricingStrategy(ABC):
    @abstractmethod
    def fee(self, parked: timedelta, vehicle: Vehicle) -> int: ...


class LowestFloorFirst(SpotSelector):
    def choose(self, floors, vehicle, fits):
        for floor in floors:
            spot = floor.take(fits[vehicle.type], lambda s: not vehicle.needs_charger or "ev" in s.features)
            if spot is not None:
                return spot
        return None


class HourlyPricing(PricingStrategy):
    def __init__(self, rates: Optional[Dict[VehicleType, int]] = None,
                 grace: timedelta = timedelta(minutes=10)):
        self.rates = rates or {VehicleType.BIKE: 10, VehicleType.CAR: 20, VehicleType.TRUCK: 40}
        self.grace = grace

    def fee(self, parked, vehicle):
        if parked <= self.grace:
            return 0
        hours = -(-parked // HOUR)  # ceiling division: every started hour counts
        return hours * self.rates[vehicle.type]


class DailyCap(PricingStrategy):
    """Decorator: same interface, one extra rule."""

    def __init__(self, inner: PricingStrategy, cap: int):
        self.inner = inner
        self.cap = cap

    def fee(self, parked, vehicle):
        days = parked // DAY
        return days * self.cap + min(self.inner.fee(parked - days * DAY, vehicle), self.cap)
