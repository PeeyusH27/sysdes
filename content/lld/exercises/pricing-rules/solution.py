import math

# A rule is a function (fee_so_far, minutes) -> new fee. The engine never looks inside one.
RULES = {
    # A short stay is free; a longer one is left alone.
    "grace": lambda p: lambda fee, minutes: 0 if minutes <= p["minutes"] else fee,
    # At most `cap` per started 24-hour day, applied to whatever the earlier rules produced.
    "daily-cap": lambda p: lambda fee, minutes: min(fee, p["cap"] * math.ceil(minutes / 1440)),
    # The discounted fee is rounded down to whole cents.
    "member-discount": lambda p: lambda fee, minutes: fee * (100 - p["percent"]) // 100,
    # Raise a paid stay to at least `cents`; a fee of 0 stays 0.
    "minimum": lambda p: lambda fee, minutes: max(fee, p["cents"]) if fee > 0 else 0,
}


class PricingEngine:
    def __init__(self, rate_per_hour):
        self.rate = rate_per_hour
        self.rules = []  # (name, apply) in the order added: each one wraps everything before it

    def add_rule(self, name, params):
        make = RULES.get(name)
        if make is None or any(n == name for n, _ in self.rules):
            return False
        self.rules.append((name, make(params)))
        return True

    def remove_rule(self, name):
        for i, (n, _) in enumerate(self.rules):
            if n == name:
                del self.rules[i]
                return True
        return False

    def fee(self, minutes):
        fee = math.ceil(minutes / 60) * self.rate  # every started hour is charged
        for _, apply in self.rules:
            fee = apply(fee, minutes)
        return fee
