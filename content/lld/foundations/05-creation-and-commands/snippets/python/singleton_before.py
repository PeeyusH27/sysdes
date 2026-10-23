# One shared instance, reachable from anywhere.
class TicketNumbers:
    _instance = None

    def __init__(self):
        self._last = 0

    @classmethod
    def get(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def next(self):
        self._last += 1
        return self._last


# A hidden dependency: nothing in the signature says this function touches shared state.
def issue_ticket(vehicle):
    return {"vehicle": vehicle, "number": TicketNumbers.get().next()}
