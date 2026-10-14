import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Dict, List

from floor import Floor
from models import FITS, Spot, Vehicle
from strategies import PricingStrategy, SpotSelector


@dataclass(frozen=True)
class Ticket:
    id: str
    vehicle: Vehicle
    spot: Spot
    entry: datetime


@dataclass(frozen=True)
class Receipt:
    fee: int
    change: int


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ParkingLot:
    def __init__(self, floors: List[Floor], selector: SpotSelector, pricing: PricingStrategy,
                 clock: Callable[[], datetime] = utc_now):  # injected, so tests control time
        self.floors = floors
        self.selector = selector
        self.pricing = pricing
        self.clock = clock
        self.tickets: Dict[str, Ticket] = {}
        self._boards: List[Callable[[int], None]] = []  # display boards (Observer)
        # Every gate is its own thread. Node gets "choose, then take" atomically from its single
        # event loop; here one lock gives the same guarantee: two gates never get the same spot.
        self._lock = threading.Lock()

    def on_change(self, board: Callable[[int], None]) -> None:
        self._boards.append(board)

    def park(self, vehicle: Vehicle) -> Ticket:
        with self._lock:
            spot = self.selector.choose(self.floors, vehicle, FITS)
            if spot is None:
                raise RuntimeError(f"Lot full for {vehicle.type.value}")
            ticket = Ticket(str(uuid.uuid4()), vehicle, spot, self.clock())
            self.tickets[ticket.id] = ticket
        self._notify(spot.floor)  # outside the lock: a slow board never blocks a gate
        return ticket

    def quote(self, ticket_id: str) -> int:
        t = self._ticket(ticket_id)
        return self.pricing.fee(self.clock() - t.entry, t.vehicle)

    def exit(self, ticket_id: str, paid: int) -> Receipt:
        with self._lock:  # two exits with one ticket: only one wins
            t = self._ticket(ticket_id)
            fee = self.quote(ticket_id)
            if paid < fee:
                raise ValueError(f"Payment of {fee} required")
            del self.tickets[ticket_id]  # a ticket can only exit once
            self.floors[t.spot.floor].release(t.spot)
        self._notify(t.spot.floor)
        return Receipt(fee, paid - fee)

    def _ticket(self, ticket_id: str) -> Ticket:
        t = self.tickets.get(ticket_id)
        if t is None:
            raise LookupError("Unknown ticket")
        return t

    def _notify(self, floor: int) -> None:
        for board in list(self._boards):
            board(floor)
