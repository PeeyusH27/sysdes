// Small roles named by what a client needs: a Charger has charge(), a Refunder has refund().
// A class offers only the roles it can honour; there is nothing to stub.
export class Cash {
  charge(cents) { return `took ${cents} in cash`; }
}

export class Card {
  charge(cents) { return `charged ${cents} to the card`; }
  refund(cents) { return `sent ${cents} back to the card`; }
  saveCard(token) { return `saved ${token}`; }
}

export const checkout = (charger, cents) => charger.charge(cents);
export const refundAll = (refunders, cents) => refunders.map((r) => r.refund(cents));
