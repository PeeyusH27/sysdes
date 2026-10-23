# OrderService owns the idea of a Mailer: anything with send(to, text). Details plug into it.
class OrderService:
    def __init__(self, mailer):
        self.mailer = mailer

    def place(self, order):
        self.mailer.send(order["email"], f"Order {order['id']} confirmed")
        return order["id"]


class SmtpMailer:
    def send(self, to, text):
        raise ConnectionError("no SMTP server reachable")  # stands in for opening a real connection


# Wiring happens once, at the edge of the program:
#   service = OrderService(SmtpMailer())
