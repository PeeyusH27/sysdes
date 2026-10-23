COINS = {5, 10, 25, 100}


# Each phase is an object that decides what every event means. The machine just forwards events to it.
class IdleState:
    name = "IDLE"

    def insert(self, m, cents):
        if cents not in COINS:
            return "REJECTED"
        m.credit += cents
        m.go(HasMoneyState())
        return "OK"

    def select(self, m, slot):
        return "NO_MONEY"

    def cancel(self, m):
        return 0

    def service(self, m, on):
        if on:
            m.go(OutOfServiceState())
        return 0


class HasMoneyState:
    name = "HAS_MONEY"

    def insert(self, m, cents):
        if cents not in COINS:
            return "REJECTED"
        m.credit += cents
        return "OK"

    def select(self, m, slot):
        item = m.slots.get(slot)
        if item is None:
            return "INVALID_SLOT"
        if item["qty"] == 0:
            return "SOLD_OUT"
        if m.credit < item["price"]:
            return "INSUFFICIENT"
        item["qty"] -= 1
        m.last_change = m.credit - item["price"]
        m.credit = 0
        m.go(IdleState())
        return "DISPENSED"

    def cancel(self, m):
        refund = m.credit
        m.credit = 0
        m.go(IdleState())
        return refund

    def service(self, m, on):
        if not on:
            return 0
        refund = self.cancel(m)  # money goes back first
        m.go(OutOfServiceState())
        return refund


class OutOfServiceState:
    name = "OUT_OF_SERVICE"

    def insert(self, m, cents):
        return "REJECTED"

    def select(self, m, slot):
        return "OUT_OF_SERVICE"

    def cancel(self, m):
        return 0

    def service(self, m, on):
        if not on:
            m.go(IdleState())
        return 0


class VendingMachine:
    def __init__(self, stock):
        self.slots = {slot: {"price": s["price"], "qty": s["qty"]} for slot, s in stock.items()}
        self.credit = 0  # cents inserted and not yet spent or refunded
        self.last_change = 0  # change paid out by the most recent DISPENSED
        self.current = IdleState()

    def go(self, nxt):
        self.current = nxt

    def insert(self, cents):
        return self.current.insert(self, cents)

    def select(self, slot):
        return self.current.select(self, slot)

    def cancel(self):
        return self.current.cancel(self)

    def service(self, on):
        return self.current.service(self, on)

    # Restocking is allowed in every phase and never changes it, so it does not need a state object.
    def restock(self, slot, qty):
        item = self.slots.get(slot)
        if item is None or isinstance(qty, bool) or not isinstance(qty, int) or qty < 1:
            return -1
        item["qty"] += qty
        return item["qty"]

    def state(self):
        return self.current.name

    def balance(self):
        return self.credit

    def change(self):
        return self.last_change

    def stock(self, slot):
        item = self.slots.get(slot)
        return -1 if item is None else item["qty"]
