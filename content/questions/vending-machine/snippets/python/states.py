from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING, Callable, Dict, Tuple, Union

from change import make_change
from models import Pending

if TYPE_CHECKING:
    from vending_machine import VendingMachine


class State(Enum):
    IDLE = "idle"
    HAS_MONEY = "hasMoney"
    DISPENSING = "dispensing"
    OUT_OF_SERVICE = "outOfService"


class EventType(Enum):
    COIN = "coin"
    SELECT = "select"
    CANCEL = "cancel"
    DROPPED = "dropped"
    DROP_FAILED = "dropFailed"
    SERVICE = "service"
    RESTOCK = "restock"
    REFILL = "refill"


@dataclass(frozen=True)
class Event:
    """One input from the coin mech, keypad, drop sensor or service key."""
    type: EventType
    coin: int = 0
    code: str = ""
    n: int = 0
    coins: Tuple[int, ...] = ()


@dataclass(frozen=True)
class Rejected:
    reason: str


Handler = Callable[["VendingMachine", Event], Union[State, Rejected]]


def _admin(apply: Callable[["VendingMachine", Event], None]) -> Handler:
    """Service-key actions: do the work, stay in the same state."""
    def handler(m: "VendingMachine", e: Event) -> State:
        apply(m, e)
        return m.state
    return handler


_restock = _admin(lambda m, e: m.inventory.restock(e.code, e.n))
_refill = _admin(lambda m, e: m.box.add(e.coins))


def _coin(m: "VendingMachine", e: Event) -> State:
    m.escrow.append(e.coin)
    return State.HAS_MONEY


def _select(m: "VendingMachine", e: Event) -> Union[State, Rejected]:
    slot = m.inventory.get(e.code)
    if slot is None:
        return Rejected(f"No slot {e.code}")
    if slot.sold_out:
        return Rejected(f"{e.code} is sold out")  # keep the credit: pick another or cancel
    if m.credit < slot.price:
        return Rejected(f"Insert {slot.price - m.credit}¢ more")
    change = make_change(m.credit - slot.price, m.box.counts_with(m.escrow))
    if change is None:
        m.refund("exact change only")  # never sell without paying change
        return State.IDLE
    m.pending = Pending(e.code, slot.price, change)  # reserved: no coin or item moves yet
    return State.DISPENSING


def _refund_to(state: State, why: str) -> Handler:
    def handler(m: "VendingMachine", e: Event) -> State:
        m.refund(why)
        return state
    return handler


def _dropped(m: "VendingMachine", e: Event) -> State:  # the drop sensor saw the item fall
    m.commit()
    return State.IDLE


def _drop_failed(m: "VendingMachine", e: Event) -> State:
    m.pending = None
    m.refund("nothing dropped")
    return State.IDLE


# The State pattern as a table: each state lists the events it accepts and returns the next state.
# An event a state doesn't list is rejected and changes nothing, so every (state, event) pair has one outcome.
STATES: Dict[State, Dict[EventType, Handler]] = {
    State.IDLE: {
        EventType.COIN: _coin,
        EventType.SERVICE: lambda m, e: State.OUT_OF_SERVICE,
        EventType.RESTOCK: _restock,
        EventType.REFILL: _refill,
    },
    State.HAS_MONEY: {
        EventType.COIN: _coin,
        EventType.SELECT: _select,
        EventType.CANCEL: _refund_to(State.IDLE, "cancelled"),
        EventType.SERVICE: _refund_to(State.OUT_OF_SERVICE, "out of service"),
    },
    State.DISPENSING: {
        EventType.DROPPED: _dropped,
        EventType.DROP_FAILED: _drop_failed,
    },
    State.OUT_OF_SERVICE: {
        EventType.SERVICE: lambda m, e: State.IDLE,
        EventType.RESTOCK: _restock,
        EventType.REFILL: _refill,
    },
}
