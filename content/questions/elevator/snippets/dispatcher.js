import { Dir, sign } from './models.js';

// Floors the car travels along its LOOK sweep before it can open at `floor` heading `dir`.
export function routeDistance(car, floor, dir) {
  const here = car.floor;
  if (!car.dir) return Math.abs(here - floor);                       // idle
  const stops = [...car.upStops, ...car.downStops];
  const top = Math.max(here, ...stops);
  const bottom = Math.min(here, ...stops);
  const onTheWay = (floor - here) * sign(car.dir) > 0 || (floor === here && !car.moving);
  if (dir === car.dir && onTheWay) return Math.abs(floor - here);   // ahead, same direction
  if (car.dir === Dir.UP) {
    if (dir === Dir.DOWN) { const turn = Math.max(top, floor); return turn - here + (turn - floor); }
    const low = Math.min(bottom, floor);
    return top - here + (top - low) + (floor - low);                 // up, all the way down, back up
  }
  if (dir === Dir.UP) { const turn = Math.min(bottom, floor); return here - turn + (floor - turn); }
  const high = Math.max(top, floor);
  return here - bottom + (high - bottom) + (high - floor);
}

// DispatchStrategy: pick(call, cars) returns a car, or null to leave the call waiting.

// Nearest car, direction-aware: route distance plus a penalty for every stop made first.
export class NearestCar {
  constructor({ stopCost = 2 } = {}) { this.stopCost = stopCost; }   // a stop costs about 2 floors of travel
  cost(car, call) {
    const dist = routeDistance(car, call.floor, call.dir);
    const before = [...car.upStops].filter(f => routeDistance(car, f, Dir.UP) < dist).length
      + [...car.downStops].filter(f => routeDistance(car, f, Dir.DOWN) < dist).length;
    return dist + this.stopCost * before;
  }
  pick(call, cars) {
    let best = null;
    let bestCost = Infinity;
    for (const car of cars) {
      const c = this.cost(car, call);
      if (c < bestCost) { best = car; bestCost = c; }                // ties go to the first car
    }
    return best;
  }
}

// Collective: only an idle car, or one already sweeping past the floor in the call's
// direction, takes the call. Otherwise it waits and the system retries every tick.
export class Collective {
  pick(call, cars) {
    const passing = car => car.dir === call.dir && (call.floor - car.floor) * sign(call.dir) > 0;
    const fits = cars.filter(car => car.idle || passing(car));
    fits.sort((a, b) => Math.abs(a.floor - call.floor) - Math.abs(b.floor - call.floor));
    return fits[0] ?? null;
  }
}
