class TicketNumbers:
    def __init__(self):
        self._last = 0

    def next(self):
        self._last += 1
        return self._last


# The dependency is visible in the constructor, and the caller decides which one to pass.
class TicketOffice:
    def __init__(self, numbers):
        self._numbers = numbers

    def issue(self, vehicle):
        return {"vehicle": vehicle, "number": self._numbers.next()}


# Still exactly one in production: create it once at startup and hand it in.
#   office = TicketOffice(TicketNumbers())
