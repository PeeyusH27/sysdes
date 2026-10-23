# One reason to change each: what an order holds, what tax is, how it prints, where it is stored.
class Order:
    def __init__(self):
        self.items = []

    def add(self, name, cents, qty):
        self.items.append({"name": name, "cents": cents, "qty": qty})

    def subtotal(self):
        return sum(i["cents"] * i["qty"] for i in self.items)


def with_tax(cents, percent):
    return (cents * (100 + percent) + 50) // 100


def receipt_text(order, total_cents):
    lines = [f"{i['qty']} x {i['name']}" for i in order.items]
    return "\n".join(lines + [f"Total: {total_cents / 100:.2f}"])


class OrderStore:
    def __init__(self, db):
        self.db = db

    def save(self, order, total_cents):
        self.db.insert("orders", {"items": order.items, "total": total_cents})
