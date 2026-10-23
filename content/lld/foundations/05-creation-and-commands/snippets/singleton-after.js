export class TicketNumbers {
  #last = 0;
  next() { return ++this.#last; }
}

// The dependency is visible in the constructor, and the caller decides which one to pass.
export class TicketOffice {
  #numbers;

  constructor(numbers) { this.#numbers = numbers; }

  issue(vehicle) { return { vehicle, number: this.#numbers.next() }; }
}

// Still exactly one in production: create it once at startup and hand it in.
//   const office = new TicketOffice(new TicketNumbers());
