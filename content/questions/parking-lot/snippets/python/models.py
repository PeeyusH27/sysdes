from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Set


class VehicleType(Enum):
    BIKE = "bike"
    CAR = "car"
    TRUCK = "truck"


class SpotType(Enum):
    BIKE = "bike"
    COMPACT = "compact"
    LARGE = "large"


# Which spot types each vehicle may use, smallest first, so big vehicles never take small spots
FITS: Dict[VehicleType, List[SpotType]] = {
    VehicleType.BIKE: [SpotType.BIKE, SpotType.COMPACT, SpotType.LARGE],
    VehicleType.CAR: [SpotType.COMPACT, SpotType.LARGE],
    VehicleType.TRUCK: [SpotType.LARGE],
}


@dataclass(frozen=True)
class Vehicle:
    type: VehicleType
    plate: str = ""
    needs_charger: bool = False


@dataclass(eq=False)  # identity equality: a Spot can sit in a set while its features change
class Spot:
    id: str
    type: SpotType
    floor: int
    features: Set[str] = field(default_factory=set)  # "ev", "accessible"…
