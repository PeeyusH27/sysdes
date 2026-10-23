// One wide contract for "a way to pay". Cash has to answer for card features it can never have.
export class Cash {
  charge(cents) { return `took ${cents} in cash`; }
  refund() { throw new Error('cash is refunded at the desk'); }
  saveCard() { throw new Error('cash has no card to save'); }
}

export class Card {
  charge(cents) { return `charged ${cents} to the card`; }
  refund(cents) { return `sent ${cents} back to the card`; }
  saveCard(token) { return `saved ${token}`; }
}

// Needs refunds only, but receives the whole wide contract.
export const refundAll = (methods, cents) => methods.map((m) => m.refund(cents));
