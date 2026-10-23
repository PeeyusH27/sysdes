// A vehicle HAS an energy source. New kinds of vehicle are new parts, not new subclasses.
export class Petrol {
  refill(plate) { return `${plate}: petrol in the tank`; }
}

export class Battery {
  refill(plate) { return `${plate}: plugged in`; }
}

export class Hybrid {
  constructor() { this.sources = [new Petrol(), new Battery()]; }
  refill(plate) { return this.sources.map((s) => s.refill(plate)).join(' + '); }
}

export class Vehicle {
  constructor(plate, energy) { this.plate = plate; this.energy = energy; }
  refill() { return this.energy.refill(this.plate); }
}
