# One wide contract for "a way to pay". Cash has to answer for card features it can never have.
class Cash:
    def charge(self, cents):
        return f"took {cents} in cash"

    def refund(self, cents):
        raise RuntimeError("cash is refunded at the desk")

    def save_card(self, token):
        raise RuntimeError("cash has no card to save")


class Card:
    def charge(self, cents):
        return f"charged {cents} to the card"

    def refund(self, cents):
        return f"sent {cents} back to the card"

    def save_card(self, token):
        return f"saved {token}"


def refund_all(methods, cents):
    """Needs refunds only, but receives the whole wide contract."""
    return [m.refund(cents) for m in methods]
