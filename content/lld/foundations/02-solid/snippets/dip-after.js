// OrderService owns the idea of a Mailer: anything with send(to, text). Details plug into it.
export class OrderService {
  constructor(mailer) { this.mailer = mailer; }

  place(order) {
    this.mailer.send(order.email, `Order ${order.id} confirmed`);
    return order.id;
  }
}

export class SmtpMailer {
  send(to, text) {
    throw new Error('no SMTP server reachable'); // stands in for opening a real connection
  }
}

// Wiring happens once, at the edge of the program:
//   const service = new OrderService(new SmtpMailer());
