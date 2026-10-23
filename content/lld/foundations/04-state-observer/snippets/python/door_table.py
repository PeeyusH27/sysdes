# state -> event -> (next state, action). A missing entry means "not allowed here".
TABLE = {
    "closed": {"open": ("open", "swing open"), "lock": ("locked", "throw bolt")},
    "open": {"close": ("closed", "latch")},
    "locked": {"unlock": ("closed", "retract bolt")},
}


class Door:
    def __init__(self):
        self.state = "closed"

    def send(self, event):
        entry = TABLE[self.state].get(event)
        if entry is None:  # illegal: nothing changes
            return {"ok": False, "state": self.state}
        self.state, action = entry
        return {"ok": True, "state": self.state, "action": action}
