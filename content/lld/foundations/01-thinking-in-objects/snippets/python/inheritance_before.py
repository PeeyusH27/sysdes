# "An electric car is a car" reads fine until someone calls refuel().
class Vehicle:
    def __init__(self, plate):
        self.plate = plate


class Car(Vehicle):
    def refuel(self):
        return f"{self.plate}: petrol in the tank"


class ElectricCar(Car):
    def refuel(self):
        raise RuntimeError("electric cars have no tank")  # breaks every caller of Car

    def charge(self):
        return f"{self.plate}: plugged in"


def fill_up(vehicles):
    return [v.refuel() for v in vehicles]
