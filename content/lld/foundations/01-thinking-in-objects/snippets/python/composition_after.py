# A vehicle HAS an energy source. New kinds of vehicle are new parts, not new subclasses.
class Petrol:
    def refill(self, plate):
        return f"{plate}: petrol in the tank"


class Battery:
    def refill(self, plate):
        return f"{plate}: plugged in"


class Hybrid:
    def __init__(self):
        self.sources = [Petrol(), Battery()]

    def refill(self, plate):
        return " + ".join(s.refill(plate) for s in self.sources)


class Vehicle:
    def __init__(self, plate, energy):
        self.plate = plate
        self.energy = energy

    def refill(self):
        return self.energy.refill(self.plate)
