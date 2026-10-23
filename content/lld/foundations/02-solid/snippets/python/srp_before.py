# Three teams edit this class: finance (tax), marketing (receipt text), platform (storage).
class Order:
    def __init__(self, db):
        self.db = db
        self.items = []

    def add(self, name, cents, qty):
        self.items.append({"name": name, "cents": cents, "qty": qty})

    def total(self):
        subtotal = sum(i["cents"] * i["qty"] for i in self.items)
        return (subtotal * 118 + 50) // 100  # 18% tax, rounded to the cent

    def receipt(self):
        lines = [f"{i['qty']} x {i['name']}" for i in self.items]
        return "\n".join(lines + [f"Total: {self.total() / 100:.2f}"])

    def save(self):
        self.db.insert("orders", {"items": self.items, "total": self.total()})
