const OPPOSITE = { up: 'down', down: 'up' };

// Strategy: a policy decides two things only, "stop here?" and "which way next?".
// It reads and edits the controller's pending stops, but it does not move the car.
class LookPolicy {
  serve(car) {
    const here = car.stops.filter(s => s.floor === car.floor);
    if (!here.length) return false;
    if (car.dir === null) { car.clearFloor(car.floor); return true; } // idle: take everything at this floor
    const d = car.dir;
    const wanted = here.some(s => s.kind === 'car' || s.kind === d);
    const turn = !car.hasStopAhead(d) && here.some(s => s.kind === OPPOSITE[d]); // last stop of the sweep
    if (!wanted && !turn) return false;
    car.clearWhere(s => s.floor === car.floor && (turn || s.kind === 'car' || s.kind === d));
    if (turn) car.dir = OPPOSITE[d];
    return true;
  }

  heading(car) {
    if (!car.stops.length) return null;
    if (car.dir === null) {
      const nearest = car.stops.reduce((a, s) => {
        const da = Math.abs(a - car.floor), ds = Math.abs(s.floor - car.floor);
        return ds < da || (ds === da && s.floor < a) ? s.floor : a;
      }, car.stops[0].floor);
      return nearest > car.floor ? 'up' : 'down';
    }
    return car.hasStopAhead(car.dir) ? car.dir : OPPOSITE[car.dir];
  }
}

class FcfsPolicy {
  serve(car) {
    if (!car.stops.length || car.stops[0].floor !== car.floor) return false;
    car.clearFloor(car.floor);
    return true;
  }

  heading(car) {
    if (!car.stops.length) return null;
    return car.stops[0].floor > car.floor ? 'up' : 'down';
  }
}

// Adding a policy is one line here; ElevatorController never changes.
const POLICIES = { look: LookPolicy, fcfs: FcfsPolicy };

class ElevatorController {
  constructor(floors, start, policy) {
    this.floors = floors;
    this.floor = start;
    this.policy = new POLICIES[policy]();
    this.stops = [];        // pending calls in request order: { floor, kind: 'up' | 'down' | 'car' }
    this.dir = null;        // the sweep direction
    this.status = `IDLE@${start}`;
  }

  #add(floor, kind) {
    if (!Number.isInteger(floor) || floor < 0 || floor >= this.floors) return false;
    if (this.stops.some(s => s.floor === floor && s.kind === kind)) return false;
    this.stops.push({ floor, kind });
    return true;
  }

  hallCall(floor, dir) {
    if (dir !== 'up' && dir !== 'down') return false;
    if ((dir === 'up' && floor === this.floors - 1) || (dir === 'down' && floor === 0)) return false;
    return this.#add(floor, dir);
  }

  carCall(floor) {
    return this.#add(floor, 'car');
  }

  tick() {
    // Doors close for free at the start of any tick.
    if (this.policy.serve(this)) return (this.status = `OPEN@${this.floor}`);
    const heading = this.policy.heading(this);
    this.dir = heading;
    if (!heading) return (this.status = `IDLE@${this.floor}`);
    this.floor += heading === 'up' ? 1 : -1;
    if (this.policy.serve(this)) return (this.status = `OPEN@${this.floor}`);
    return (this.status = `${heading.toUpperCase()}@${this.floor}`);
  }

  state() {
    return this.status;
  }

  pending() {
    return this.stops
      .map(s => [s.floor, s.kind])
      .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  }

  // ---- helpers the policies use
  hasStopAhead(d) {
    return this.stops.some(s => (d === 'up' ? s.floor > this.floor : s.floor < this.floor));
  }

  clearWhere(test) {
    this.stops = this.stops.filter(s => !test(s));
  }

  clearFloor(floor) {
    this.clearWhere(s => s.floor === floor);
  }
}
