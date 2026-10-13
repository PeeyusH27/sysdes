import { EventEmitter } from 'node:events';
import { ElevatorCar } from './elevator-car.js';
import { Dir, hallCall } from './models.js';

// The controller. Panels post presses and the clock posts ticks to one event loop; each runs
// to completion, so two panels can never hand the same hall call to two cars.
export class ElevatorSystem extends EventEmitter {
  constructor({ floors, cars = 3, strategy, doorTicks = 2 }) {
    super();
    Object.assign(this, { floors, strategy });
    this.cars = Array.from({ length: cars }, (_, i) => new ElevatorCar('ABCDEFGH'[i], { floors, doorTicks }));
    this.assigned = new Map();       // hall-call key -> { call, carId }: exactly one owner per call
    this.waiting = [];               // calls no car can take yet, oldest first
  }

  car(id) {
    const car = this.cars.find(c => c.id === id);
    if (!car) throw new Error(`Unknown car ${id}`);
    return car;
  }

  owner(key) { return this.assigned.get(key)?.carId ?? null; }

  hallCall(floor, dir) {
    const top = this.floors - 1;
    const noButton = (dir === Dir.UP && floor === top) || (dir === Dir.DOWN && floor === 0);
    if (!Number.isInteger(floor) || floor < 0 || floor > top || noButton) throw new RangeError(`No ${dir} button at floor ${floor}`);
    const call = hallCall(floor, dir);
    const known = this.assigned.has(call.key) || this.waiting.some(c => c.key === call.key);
    if (known) return this.owner(call.key);          // pressing ▲ twice is still one call
    const carId = this.#assign(call);
    if (carId) return carId;
    this.waiting.push(call);
    this.emit('queued', call);
    return null;
  }

  carCall(carId, floor) { this.car(carId).addStop(floor); }

  tick() {
    for (const car of this.cars) {
      const stop = car.step();
      if (!stop) continue;
      const key = hallCall(stop.floor, stop.dir).key;
      if (this.owner(key) === car.id) {
        this.assigned.delete(key);
        this.emit('cleared', key, car.id);       // the hall lamp goes dark
      }
      this.emit('arrived', stop);                // displays and hall lanterns observe this
    }
    this.waiting = this.waiting.filter(call => !this.#assign(call));
  }

  takeOutOfService(carId) {
    this.car(carId).takeOutOfService();
    const orphans = [...this.assigned.values()].filter(a => a.carId === carId).map(a => a.call);
    for (const call of orphans) this.assigned.delete(call.key);
    const stranded = orphans.filter(call => !this.#assign(call));   // no car can take it right now
    this.waiting = [...stranded, ...this.waiting];                  // they were pressed first
  }

  returnToService(carId) { this.car(carId).returnToService(); }

  #assign(call) {
    const car = this.strategy.pick(call, this.cars.filter(c => c.inService));
    if (!car) return null;
    car.addStop(call.floor, call.dir);
    this.emit('assigned', call.key, car.id);
    const stops = call.dir === Dir.UP ? car.upStops : car.downStops;
    if (stops.has(call.floor)) this.assigned.set(call.key, { call, carId: car.id });
    else this.emit('cleared', call.key, car.id);   // the car was already here and opened on the spot
    return car.id;
  }
}
