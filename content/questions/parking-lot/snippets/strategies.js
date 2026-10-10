export class LowestFloorFirst {                              // a SpotSelector
  choose(floors, vehicle, fits) {
    for (const floor of floors) {
      const spot = floor.take(fits[vehicle.type], s => !vehicle.needsCharger || s.features.has('ev'));
      if (spot) return spot;
    }
    return null;
  }
}

export class HourlyPricing {                                 // a PricingStrategy
  constructor(rates = { bike: 10, car: 20, truck: 40 }, graceMinutes = 10) {
    this.rates = rates;
    this.graceMs = graceMinutes * 60_000;
  }
  fee(ms, vehicle) {
    if (ms <= this.graceMs) return 0;
    return Math.ceil(ms / 3_600_000) * this.rates[vehicle.type];   // every started hour counts
  }
}

export class DailyCap {                                      // decorator: same interface, one extra rule
  constructor(inner, cap) { this.inner = inner; this.cap = cap; }
  fee(ms, vehicle) {
    const days = Math.floor(ms / 86_400_000);
    return days * this.cap + Math.min(this.inner.fee(ms - days * 86_400_000, vehicle), this.cap);
  }
}
