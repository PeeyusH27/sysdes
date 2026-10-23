def is_night(hour):
    return hour >= 22 or hour < 6


# A decorator is a PricingStrategy that holds another one: same interface in, same interface out.
class GracePeriod:
    def __init__(self, inner, minutes):
        self.inner = inner
        self.minutes = minutes

    def fee(self, stay):
        return 0 if stay["minutes"] <= self.minutes else self.inner.fee(stay)


class NightDiscount:
    def __init__(self, inner, percent_off):
        self.inner = inner
        self.percent_off = percent_off

    def fee(self, stay):
        fee = self.inner.fee(stay)
        if not is_night(stay["enter_hour"]):
            return fee
        return (fee * (100 - self.percent_off) + 50) // 100  # integer math, halves round up


# One cap per stay. A cap per calendar day needs the stay split at midnight (see the parking lot question).
class Cap:
    def __init__(self, inner, maximum):
        self.inner = inner
        self.maximum = maximum

    def fee(self, stay):
        return min(self.inner.fee(stay), self.maximum)
