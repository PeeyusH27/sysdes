// One shared instance, reachable from anywhere.
export class TicketNumbers {
  static #instance;
  #last = 0;

  static get() {
    return (TicketNumbers.#instance ??= new TicketNumbers());
  }

  next() { return ++this.#last; }
}

// A hidden dependency: nothing in the signature says this function touches shared state.
export const issueTicket = (vehicle) => ({ vehicle, number: TicketNumbers.get().next() });
