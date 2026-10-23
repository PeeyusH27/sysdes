// A rule is a function (feeSoFar, minutes) → new fee. The engine never looks inside one.
const RULES = new Map([
  // A short stay is free; a longer one is left alone.
  ["grace", ({ minutes: free }) => (fee, minutes) => (minutes <= free ? 0 : fee)],
  // At most `cap` per started 24-hour day, applied to whatever the earlier rules produced.
  ["daily-cap", ({ cap }) => (fee, minutes) => Math.min(fee, cap * Math.ceil(minutes / 1440))],
  // The discounted fee is rounded down to whole cents.
  ["member-discount", ({ percent }) => (fee) => Math.floor((fee * (100 - percent)) / 100)],
  // Raise a paid stay to at least `cents`; a fee of 0 stays 0.
  ["minimum", ({ cents }) => (fee) => (fee > 0 ? Math.max(fee, cents) : 0)],
]);

class PricingEngine {
  constructor(ratePerHour) {
    this.rate = ratePerHour;
    this.rules = []; // { name, apply } in the order added: each one wraps everything before it
  }

  addRule(name, params) {
    const make = RULES.get(name);
    if (!make || this.rules.some((r) => r.name === name)) return false;
    this.rules.push({ name, apply: make(params) });
    return true;
  }

  removeRule(name) {
    const i = this.rules.findIndex((r) => r.name === name);
    if (i === -1) return false;
    this.rules.splice(i, 1);
    return true;
  }

  fee(minutes) {
    let fee = Math.ceil(minutes / 60) * this.rate; // every started hour is charged
    for (const rule of this.rules) fee = rule.apply(fee, minutes);
    return fee;
  }
}
