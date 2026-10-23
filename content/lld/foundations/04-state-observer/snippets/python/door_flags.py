# Two flags describe four doors. Only three of them exist, and nothing stops the fourth.
class Door:
    def __init__(self):
        self.is_open = False
        self.is_locked = False

    def open(self):
        if not self.is_locked:
            self.is_open = True

    def close(self):
        self.is_open = False

    def lock(self):  # forgot: an open door must not lock
        self.is_locked = True

    def unlock(self):
        self.is_locked = False
