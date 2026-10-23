class Email:
    cost_in_cents = 0

    def send(self, to, text):
        return f"email to {to}: {text}"


class Sms:
    cost_in_cents = 4

    def send(self, to, text):
        return f"sms to {to}: {text[:160]}"


# The one place that knows which kinds exist. A new kind is one register() call.
class ChannelRegistry:
    def __init__(self):
        self._makers = {}

    def register(self, kind, make):
        self._makers[kind] = make
        return self

    def create(self, kind):
        make = self._makers.get(kind)
        if make is None:
            raise ValueError(f"unknown channel: {kind}")
        return make()


def default_channels():
    return ChannelRegistry().register("email", Email).register("sms", Sms)
