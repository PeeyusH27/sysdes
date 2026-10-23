# A PricingStrategy is any object with fee(stay) that returns whole currency units.
class HourlyRate:
    def __init__(self, rate):
        self.rate = rate

    def fee(self, stay):
        return (stay["minutes"] + 59) // 60 * self.rate  # every started hour counts


class FlatRate:
    def __init__(self, amount):
        self.amount = amount

    def fee(self, stay):
        return self.amount


class Garage:
    def __init__(self, pricing):
        self.pricing = pricing  # handed in, never built in here

    def checkout(self, stay):
        return self.pricing.fee(stay)

    def switch_to(self, pricing):  # stadium night: swap while running
        self.pricing = pricing


# Choosing at runtime is a strategy that picks another strategy.
class ByVehicle:
    def __init__(self, table, fallback):
        self.table = table
        self.fallback = fallback

    def fee(self, stay):
        return self.table.get(stay["vehicle"], self.fallback).fee(stay)
