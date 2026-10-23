import threading


# Python threads can switch between any two lines, so check and claim share one lock.
# The lock covers only the check and the claim. The slow part runs after it is released.
class Rooms:
    def __init__(self, between=None):
        self._owner = {}
        self._lock = threading.Lock()
        self._between = between or (lambda: None)

    def book(self, room, who):
        with self._lock:
            if room in self._owner:
                return False
            self._owner[room] = who  # check and act under one lock
        self._between()              # the slow part; on failure, release the claim here
        return True

    def owner(self, room):
        return self._owner.get(room)
