# Check, then act, with a gap between them. Another thread can slip into the gap.
class RoomsRacy:
    def __init__(self, between=None):
        self._owner = {}
        self._between = between or (lambda: None)  # stands in for a payment or database call

    def book(self, room, who):
        if room in self._owner:      # check
            return False
        self._between()              # anyone else may pass the same check now
        self._owner[room] = who      # act: too late, the check is stale
        return True

    def owner(self, room):
        return self._owner.get(room)
