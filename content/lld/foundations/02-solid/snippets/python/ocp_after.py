# New customer kinds are registered, not edited in. A rule is any function from price to discount.
def percent_off(p):
    return lambda cents: cents * p // 100


class Pricing:
    def __init__(self):
        self._rules = {}

    def register(self, kind, discount):
        self._rules[kind] = discount
        return self

    def price(self, kind, cents):
        discount = self._rules.get(kind)
        return cents - (discount(cents) if discount else 0)
