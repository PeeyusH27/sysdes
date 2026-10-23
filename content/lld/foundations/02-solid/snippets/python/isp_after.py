# Small roles named by what a client needs: a Charger has charge(), a Refunder has refund().
# A class offers only the roles it can honour; there is nothing to stub.
from typing import Protocol


class Charger(Protocol):
    def charge(self, cents): ...


class Refunder(Protocol):
    def refund(self, cents): ...


class Cash:
    def charge(self, cents):
        return f"took {cents} in cash"


class Card:
    def charge(self, cents):
        return f"charged {cents} to the card"

    def refund(self, cents):
        return f"sent {cents} back to the card"

    def save_card(self, token):
        return f"saved {token}"


def checkout(charger, cents):
    return charger.charge(cents)


def refund_all(refunders, cents):
    return [r.refund(cents) for r in refunders]
