// The high-level rule (confirm an order) is welded to a low-level detail (SMTP).
export class SmtpMailer {
  send(to, text) {
    throw new Error('no SMTP server reachable'); // stands in for opening a real connection
  }
}

export class OrderService {
  place(order) {
    new SmtpMailer().send(order.email, `Order ${order.id} confirmed`);
    return order.id;
  }
}
