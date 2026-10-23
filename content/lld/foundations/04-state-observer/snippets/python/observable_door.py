from door_table import Door
from emitter import Emitter


class ObservableDoor:
    def __init__(self):
        self._door = Door()
        self._changes = Emitter()

    @property
    def state(self):
        return self._door.state

    def subscribe(self, listener):
        return self._changes.subscribe(listener)

    def send(self, event):
        before = self._door.state
        result = self._door.send(event)
        # Announce after the change is done, and only for legal moves. Push: the event says what happened.
        errors = self._changes.emit({"from": before, "event": event, "to": result["state"]}) if result["ok"] else []
        return {**result, "errors": errors}
