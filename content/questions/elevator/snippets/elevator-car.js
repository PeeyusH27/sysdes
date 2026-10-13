import { CarState, Dir, opposite, sign } from './models.js';

const MOVING = new Set([CarState.MOVING_UP, CarState.MOVING_DOWN]);

// One car is a small state machine. Time is an injected tick: one tick moves one floor,
// or counts down the open doors, so tests are deterministic.
export class ElevatorCar {
  constructor(id, { floors, floor = 0, doorTicks = 2 }) {
    Object.assign(this, { id, floors, floor, doorTicks });
    this.state = CarState.IDLE;
    this.dir = null;                 // the sweep LOOK is committed to; null when idle
    this.upStops = new Set();        // stop here while going up: up hall calls, car calls above
    this.downStops = new Set();      // stop here while going down
    this.doorTimer = 0;
  }

  get inService() { return this.state !== CarState.OUT_OF_SERVICE; }
  get moving() { return MOVING.has(this.state); }
  get idle() { return this.state === CarState.IDLE && !this.upStops.size && !this.downStops.size; }

  addStop(floor, dir) {              // dir for a hall call; omitted for a car call
    if (!Number.isInteger(floor) || floor < 0 || floor >= this.floors) throw new RangeError(`No floor ${floor}`);
    if (!this.inService) throw new Error(`Car ${this.id} is out of service`);
    if (floor === this.floor && !this.moving && (!dir || !this.dir || dir === this.dir)) return this.openDoors();
    const d = dir ?? (floor > this.floor ? Dir.UP : floor < this.floor ? Dir.DOWN : opposite(this.dir));
    (d === Dir.UP ? this.upStops : this.downStops).add(floor);
  }

  openDoors() {
    if (this.moving) throw new Error('Doors stay shut while the car is moving');
    if (!this.inService) throw new Error(`Car ${this.id} is out of service`);
    this.state = CarState.DOORS_OPEN;
    this.doorTimer = this.doorTicks;  // a door sensor would reset this while the beam is blocked
  }

  // Advance one tick. Returns { carId, floor, dir } when the car stops and opens, else null.
  step() {
    if (!this.inService) return null;
    if (this.state === CarState.DOORS_OPEN) {
      if (--this.doorTimer > 0) return null;
      this.state = CarState.IDLE;    // doors closed: stopped at this.floor
    }
    if (this.state === CarState.IDLE) {
      const plan = this.#plan();
      if (plan.serve) return this.#stop(plan.serve);
      this.dir = plan.move ?? null;
      if (!plan.move) return null;   // nothing to do: stay idle
      this.state = plan.move === Dir.UP ? CarState.MOVING_UP : CarState.MOVING_DOWN;
    }
    this.floor += this.state === CarState.MOVING_UP ? 1 : -1;
    if (this.floor < 0 || this.floor >= this.floors) throw new Error('Ran off the end of the shaft');
    const plan = this.#plan();       // reached a new floor: stop here, keep going, or halt
    if (plan.serve) return this.#stop(plan.serve);
    if (plan.move !== this.dir) {    // the stop it was heading for was taken away: halt, never reverse in motion
      this.state = CarState.IDLE;
      this.dir = plan.move ?? null;
    }
    return null;
  }

  takeOutOfService() {               // a real car first levels at the nearest floor and opens
    this.upStops.clear();
    this.downStops.clear();
    this.state = CarState.OUT_OF_SERVICE;
    this.dir = null;
  }

  returnToService() { this.state = CarState.IDLE; }

  // LOOK: keep the sweep while any stop lies ahead and serve stops in that direction;
  // turn around only when nothing is ahead.
  #plan() {
    const all = [...this.upStops, ...this.downStops];
    const ahead = d => all.some(f => (f - this.floor) * sign(d) > 0);
    const wants = d => (d === Dir.UP ? this.upStops : this.downStops).has(this.floor);
    let d = this.dir;
    if (!d) {                        // idle: serve this floor, else head for the nearest stop
      if (wants(Dir.UP)) return { serve: Dir.UP };
      if (wants(Dir.DOWN)) return { serve: Dir.DOWN };
      if (!all.length) return {};
      const nearest = all.reduce((a, b) => (Math.abs(b - this.floor) < Math.abs(a - this.floor) ? b : a));
      d = nearest > this.floor ? Dir.UP : Dir.DOWN;
    }
    if (ahead(d)) return wants(d) ? { serve: d } : { move: d };
    if (wants(d)) return { serve: d };                     // last stop of this sweep
    if (wants(opposite(d))) return { serve: opposite(d) }; // turn around here
    return ahead(opposite(d)) ? { move: opposite(d) } : {};
  }

  #stop(dir) {
    this.state = CarState.IDLE;      // stopped exactly at this.floor, so opening is legal
    (dir === Dir.UP ? this.upStops : this.downStops).delete(this.floor);
    this.dir = dir;
    this.openDoors();
    return { carId: this.id, floor: this.floor, dir };
  }
}
