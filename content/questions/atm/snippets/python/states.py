from typing import Any, Callable, Dict, Optional, Tuple

# A handler returns (next_state, data) to accept, or (None, reason) to reject.
Outcome = Tuple[Optional[str], Any]


def no(reason: str) -> Outcome:
    return None, reason


def to(next_state: str, **data: Any) -> Outcome:
    return next_state, data


def insert_card(atm, args: dict) -> Outcome:
    account = atm.accounts.get(args["id"])
    if account is None:
        return no("unknown card")
    if account.locked:
        return no("card retained: account locked")
    atm.card = account
    return to("card_in")


def enter_pin(atm, args: dict) -> Outcome:
    result = atm.card.try_pin(args["pin"])
    if result == "ok":
        return to("authenticated", authenticated=True)
    if result == "locked":
        atm.card = None
        return to("idle", authenticated=False, retained=True)
    return to("card_in", authenticated=False, attempts_left=atm.card.attempts_left)


def balance(atm, args: dict) -> Outcome:
    return to("authenticated", balance=atm.card.balance)


def withdraw(atm, args: dict) -> Outcome:
    amount = args["amount"]
    if not isinstance(amount, int) or amount <= 0 or amount % atm.unit != 0:
        return no("invalid amount")
    notes = atm.chain.plan(amount, atm.stock)  # plan first: no plan, no debit
    if notes is None:
        return no("cannot dispense that amount")
    if not atm.card.debit(amount):
        return no("insufficient funds")
    if not atm.hardware(notes):
        atm.card.credit(amount)
        return no("dispenser jam: nothing charged")
    for note, n in notes.items():
        atm.stock[note] -= n
    return to("authenticated", notes=notes, balance=atm.card.balance)


def eject(atm, args: dict) -> Outcome:
    atm.card = None
    return to("idle")


# The State pattern as a table: each state lists the events it accepts and returns the next state.
# An event a state does not list is rejected and changes nothing, so every (state, event) pair has one outcome.
STATES: Dict[str, Dict[str, Callable[[Any, dict], Outcome]]] = {
    "idle": {"insert_card": insert_card},
    "card_in": {"enter_pin": enter_pin, "eject": eject},
    "authenticated": {"balance": balance, "withdraw": withdraw, "eject": eject},
}
