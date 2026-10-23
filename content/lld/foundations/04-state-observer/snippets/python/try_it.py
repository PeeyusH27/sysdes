from emitter import Emitter  # @hide
# The table is data. Add an entry (try lock under open) or a whole state, and the machine changes with it.
table = {
    "closed": {"open": "open", "lock": "locked"},
    "open": {"close": "closed"},
    "locked": {"unlock": "closed"},
}

state = "closed"
changes = Emitter()
changes.subscribe(lambda e: print(f"{e['from']} --{e['event']}--> {e['to']}"))
changes.subscribe(lambda e: print("  alarm armed") if e["to"] == "locked" else None)


def send(event):
    global state
    to = table[state].get(event)
    if to is None:
        print(f"{state}: {event} ignored")
        return
    before = state
    state = to  # change first, announce second
    changes.emit({"from": before, "event": event, "to": to})


for event in ["open", "lock", "close", "lock", "open", "unlock"]:
    send(event)
