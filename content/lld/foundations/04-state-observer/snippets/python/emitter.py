class Emitter:
    def __init__(self):
        self._listeners = []  # a list: subscribing the same function twice is still one subscription

    def subscribe(self, fn):
        if fn not in self._listeners:
            self._listeners.append(fn)

        def unsubscribe():  # hand back the way out, so callers cannot forget it
            if fn in self._listeners:
                self._listeners.remove(fn)

        return unsubscribe

    @property
    def size(self):
        return len(self._listeners)

    def emit(self, event):
        errors = []
        for fn in list(self._listeners):  # loop over a copy: listeners may unsubscribe while we run
            try:
                fn(event)
            except Exception as err:  # one bad listener must not silence the rest
                errors.append(err)
        return errors
