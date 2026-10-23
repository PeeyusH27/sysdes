# The same if/elif ladder, pasted wherever the channel matters.
def send(channel, to, text):
    if channel == "email":
        return f"email to {to}: {text}"
    if channel == "sms":
        return f"sms to {to}: {text[:160]}"
    raise ValueError(f"unknown channel: {channel}")


def cost_in_cents(channel):
    if channel == "email":
        return 0
    if channel == "sms":
        return 4
    raise ValueError(f"unknown channel: {channel}")


# Adding "push" means finding every ladder like these, in every file, and editing each one.
