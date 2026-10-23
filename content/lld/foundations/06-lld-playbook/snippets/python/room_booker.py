# Half-open intervals [start, end): a meeting that ends at 10 does not clash with one that starts at 10.
def overlaps(a, b):
    return a["start"] < b["end"] and b["start"] < a["end"]


class RoomBooker:
    def __init__(self, rooms):
        self._bookings = {room: [] for room in rooms}  # room -> list of {start, end, who}

    def is_free(self, room, start, end):
        if room not in self._bookings:
            raise KeyError(f"unknown room: {room}")
        slot = {"start": start, "end": end}
        return not any(overlaps(b, slot) for b in self._bookings[room])

    # Not thread safe as written: with threads, wrap the check and the append in one lock.
    def book(self, room, start, end, who):
        if not start < end:
            raise ValueError("start must be before end")
        if not self.is_free(room, start, end):
            return False
        self._bookings[room].append({"start": start, "end": end, "who": who})
        return True

    def free_rooms(self, start, end):
        return [room for room in self._bookings if self.is_free(room, start, end)]
