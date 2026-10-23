# Each state is an object. It answers only the events it allows; the base class says no to the rest.
class State:
    def open(self):
        return None

    def close(self):
        return None

    def lock(self):
        return None

    def unlock(self):
        return None


class Closed(State):
    name = "closed"

    def open(self):
        return Open(), "swing open"

    def lock(self):
        return Locked(), "throw bolt"


class Open(State):
    name = "open"

    def close(self):
        return Closed(), "latch"


class Locked(State):
    name = "locked"

    def unlock(self):
        return Closed(), "retract bolt"


EVENTS = {"open", "close", "lock", "unlock"}


class Door:
    def __init__(self):
        self.state = Closed()

    def send(self, event):
        result = getattr(self.state, event)() if event in EVENTS else None
        if result is None:
            return {"ok": False, "state": self.state.name}
        self.state, action = result
        return {"ok": True, "state": self.state.name, "action": action}
