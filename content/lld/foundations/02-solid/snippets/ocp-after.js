// New customer kinds are registered, not edited in. A rule is any function from price to discount.
export const percentOff = (p) => (cents) => Math.floor((cents * p) / 100);

export class Pricing {
  #rules = new Map();
  register(kind, discount) { this.#rules.set(kind, discount); return this; }
  price(kind, cents) {
    const discount = this.#rules.get(kind);
    return cents - (discount ? discount(cents) : 0);
  }
}
