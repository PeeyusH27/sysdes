# The high-level rule (confirm an order) is welded to a low-level detail (SMTP).
class SmtpMailer:
    def send(self, to, text):
        raise ConnectionError("no SMTP server reachable")  # stands in for opening a real connection


class OrderService:
    def place(self, order):
        SmtpMailer().send(order["email"], f"Order {order['id']} confirmed")
        return order["id"]
