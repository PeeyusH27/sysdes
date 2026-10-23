// A PricingStrategy is any object with fee(stay) that returns whole currency units.
export class HourlyRate {
  constructor(rate) { this.rate = rate; }
  fee({ minutes }) { return Math.ceil(minutes / 60) * this.rate; }  // every started hour counts
}

export class FlatRate {
  constructor(amount) { this.amount = amount; }
  fee() { return this.amount; }
}

export class Garage {
  constructor(pricing) { this.pricing = pricing; }  // handed in, never built in here
  checkout(stay) { return this.pricing.fee(stay); }
  switchTo(pricing) { this.pricing = pricing; }     // stadium night: swap while running
}

// Choosing at runtime is a strategy that picks another strategy.
export class ByVehicle {
  constructor(table, fallback) { this.table = table; this.fallback = fallback; }
  fee(stay) { return (this.table[stay.vehicle] ?? this.fallback).fee(stay); }
}
