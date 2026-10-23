NOTES = [100, 50, 20, 10]
MAX_TRIES = 3


class NoteHandler:
    """Chain of Responsibility: each handler owns one note value, takes what it can and hands the rest on."""

    def __init__(self, note, next_handler):
        self.note = note
        self.next = next_handler

    def plan(self, amount, stock):
        """[[note, count], ...] largest first covering `amount` exactly, or None.
        Most notes first, then fewer: a greedy 50 for 60 would strand 10 when only three 20s can finish it."""
        most = min(amount // self.note, stock[self.note])
        for n in range(most, -1, -1):
            rest = amount - n * self.note
            if self.next is not None:
                tail = self.next.plan(rest, stock)
            else:
                tail = [] if rest == 0 else None
            if tail is not None:
                return [[self.note, n]] + tail if n > 0 else tail
        return None


# State pattern as a table: a state lists the events it accepts. Anything else gets the caller's sentinel.
def insert_card(atm, card_id):
    account = atm.accounts.get(card_id)
    if account is None:
        return "UNKNOWN_CARD"
    if account["locked"]:
        return "LOCKED"
    atm.card = account
    atm.current = "CARD_IN"
    return "OK"


def enter_pin(atm, pin):
    account = atm.card
    if pin == account["pin"]:
        account["failed"] = 0
        atm.current = "AUTHENTICATED"
        return "OK"
    account["failed"] += 1
    if account["failed"] < MAX_TRIES:
        return "WRONG_PIN"
    account["locked"] = True
    atm.card = None
    atm.current = "IDLE"
    return "LOCKED"


def balance(atm):
    return atm.card["balance"]


def withdraw(atm, amount):
    if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0 or amount % 10 != 0:
        return "INVALID_AMOUNT"
    notes = atm.chain.plan(amount, atm.stock)
    if notes is None:
        return "NO_EXACT_NOTES"
    if atm.card["balance"] < amount:
        return "INSUFFICIENT_FUNDS"
    if atm.jammed:
        return "JAM"  # the cash unit fails before anything is committed
    atm.card["balance"] -= amount
    for note, n in notes:
        atm.stock[note] -= n
    return notes


def eject(atm):
    atm.card = None
    atm.current = "IDLE"
    return "OK"


TABLE = {
    "IDLE": {"insert_card": insert_card},
    "CARD_IN": {"enter_pin": enter_pin, "eject": eject},
    "AUTHENTICATED": {"balance": balance, "withdraw": withdraw, "eject": eject},
}


class Atm:
    def __init__(self, accounts, stock):
        self.accounts = {i: {"pin": pin, "balance": bal, "failed": 0, "locked": False} for i, pin, bal in accounts}
        self.stock = dict(zip(NOTES, stock))
        self.chain = None
        for note in reversed(NOTES):
            self.chain = NoteHandler(note, self.chain)
        self.current = "IDLE"
        self.card = None
        self.jammed = False

    def _on(self, event, invalid, *args):
        handler = TABLE[self.current].get(event)
        return handler(self, *args) if handler else invalid

    def insert_card(self, id):
        return self._on("insert_card", "INVALID_STATE", id)

    def enter_pin(self, pin):
        return self._on("enter_pin", "INVALID_STATE", pin)

    def balance(self):
        return self._on("balance", -1)

    def withdraw(self, amount):
        return self._on("withdraw", "INVALID_STATE", amount)

    def eject(self):
        return self._on("eject", "INVALID_STATE")

    def state(self):
        return self.current

    def cash(self):
        return [[note, self.stock[note]] for note in NOTES]

    def jam(self, flag):
        self.jammed = bool(flag)
        return True
