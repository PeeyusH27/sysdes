const isNight = (hour) => hour >= 22 || hour < 6;

// A decorator is a PricingStrategy that holds another one: same interface in, same interface out.
export class GracePeriod {
  constructor(inner, minutes) { this.inner = inner; this.minutes = minutes; }
  fee(stay) { return stay.minutes <= this.minutes ? 0 : this.inner.fee(stay); }
}

export class NightDiscount {
  constructor(inner, percentOff) { this.inner = inner; this.percentOff = percentOff; }
  fee(stay) {
    const fee = this.inner.fee(stay);
    if (!isNight(stay.enterHour)) return fee;
    return Math.floor((fee * (100 - this.percentOff) + 50) / 100);  // integer math, halves round up
  }
}

// One cap per stay. A cap per calendar day needs the stay split at midnight (see the parking lot question).
export class Cap {
  constructor(inner, max) { this.inner = inner; this.max = max; }
  fee(stay) { return Math.min(this.inner.fee(stay), this.max); }
}
