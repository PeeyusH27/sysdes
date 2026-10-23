// "An electric car is a car" reads fine until someone calls refuel().
export class Vehicle {
  constructor(plate) { this.plate = plate; }
}

export class Car extends Vehicle {
  refuel() { return `${this.plate}: petrol in the tank`; }
}

export class ElectricCar extends Car {
  refuel() { throw new Error('electric cars have no tank'); } // breaks every caller of Car
  charge() { return `${this.plate}: plugged in`; }
}

export const fillUp = (vehicles) => vehicles.map((v) => v.refuel());
