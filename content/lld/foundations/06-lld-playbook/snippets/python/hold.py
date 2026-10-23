import time


# The clock is a parameter, so a test can move time instead of waiting for it.
class RoomHolds:
    def __init__(self, now=time.time, hold_seconds=600):
        self._until = {}
        self._now = now
        self._hold_seconds = hold_seconds

    def is_held(self, room):
        return self._until.get(room, 0) > self._now()

    # A hold lasts until the exact instant start + hold_seconds; at that instant it is gone.
    def hold(self, room):
        if self.is_held(room):
            return False
        self._until[room] = self._now() + self._hold_seconds
        return True
