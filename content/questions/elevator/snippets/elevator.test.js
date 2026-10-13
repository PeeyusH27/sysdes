import { test, expect } from 'vitest';
import { Dir, CarState } from './models.js';
import { ElevatorCar } from './elevator-car.js';
import { NearestCar, Collective, routeDistance } from './dispatcher.js';
import { ElevatorSystem } from './elevator-system.js';

// Tick until `count` stops happen (or 200 ticks), returning "floor dir" for each stop.
const run = (sys, count = Infinity, ticks = 200) => {
  const stops = [];
  const onStop = s => stops.push(`${s.carId}${s.floor}${s.dir === Dir.UP ? '▲' : '▼'}`);
  sys.on('arrived', onStop);
  for (let i = 0; i < ticks && stops.length < count; i++) sys.tick();
  sys.off('arrived', onStop);
  return stops;
};
const oneCar = () => new ElevatorSystem({ floors: 10, cars: 1, strategy: new NearestCar() });

test('LOOK serves stops in travel order and reverses only when nothing is ahead', () => {
  const sys = oneCar();
  for (const f of [5, 2, 7]) sys.carCall('A', f);
  expect(run(sys, 1)).toEqual(['A2▲']);
  sys.carCall('A', 1);                              // behind the car: waits for the way back
  sys.carCall('A', 6);                              // ahead: joins this sweep
  expect(run(sys)).toEqual(['A5▲', 'A6▲', 'A7▲', 'A1▼']);
});

test('hall calls are served in their own direction', () => {
  const sys = oneCar();
  sys.carCall('A', 6);
  sys.hallCall(3, Dir.UP);
  sys.hallCall(4, Dir.DOWN);                        // passed on the way up, served on the way down
  expect(run(sys)).toEqual(['A3▲', 'A6▲', 'A4▼']);
});

test('pressing ▲ twice is one call, owned by exactly one car', () => {
  const sys = new ElevatorSystem({ floors: 10, cars: 3, strategy: new NearestCar() });
  const assigned = [];
  sys.on('assigned', (key, car) => assigned.push(`${key}:${car}`));
  expect(sys.hallCall(4, Dir.UP)).toBe('A');
  expect(sys.hallCall(4, Dir.UP)).toBe('A');
  expect(assigned).toEqual(['4▲:A']);
  const owners = sys.cars.filter(c => c.upStops.has(4)).map(c => c.id);
  expect(owners).toEqual(['A']);
});

test('nearest car is direction-aware', () => {
  const up = new ElevatorCar('A', { floors: 10, floor: 2 });
  up.addStop(5);
  up.dir = Dir.UP;                                  // at 2, sweeping up to 5
  const idle = new ElevatorCar('B', { floors: 10, floor: 6 });
  const nc = new NearestCar();
  expect(routeDistance(up, 4, Dir.UP)).toBe(2);
  expect(nc.cost(up, { floor: 4, dir: Dir.DOWN })).toBe(4 + 2);   // up to 5, back to 4, one stop first
  expect(nc.cost(up, { floor: 1, dir: Dir.UP })).toBe(7 + 2);     // a whole round trip
  expect(nc.pick({ floor: 4, dir: Dir.DOWN }, [up, idle]).id).toBe('B');
  expect(nc.pick({ floor: 3, dir: Dir.UP }, [up, idle]).id).toBe('A'); // it passes 3 anyway
});

test('collective: a call waits until a car is idle or sweeping past it', () => {
  const sys = new ElevatorSystem({ floors: 10, cars: 1, strategy: new Collective() });
  sys.carCall('A', 8);
  sys.tick();                                       // A is now moving up
  expect(sys.hallCall(5, Dir.UP)).toBe('A');        // on its way
  expect(sys.hallCall(2, Dir.DOWN)).toBeNull();     // behind it, wrong direction: queued
  expect(sys.waiting.map(c => c.key)).toEqual(['2▼']);
  expect(run(sys)).toEqual(['A5▲', 'A8▲', 'A2▼']);  // picked up once A went idle at 8
  expect(sys.waiting).toEqual([]);
});

test('a failed car hands its hall calls to the others', () => {
  const sys = new ElevatorSystem({ floors: 10, cars: 3, strategy: new NearestCar() });
  sys.cars[1].floor = 4;                            // B parks at 4, C at 8
  sys.cars[2].floor = 8;
  expect(sys.hallCall(5, Dir.DOWN)).toBe('B');
  sys.takeOutOfService('B');
  expect(sys.owner('5▼')).toBe('C');
  expect(sys.hallCall(4, Dir.UP)).not.toBe('B');    // never assigned to a car out of service
  const cleared = [];
  sys.on('cleared', (key, car) => cleared.push(`${key}:${car}`));
  run(sys);
  expect(cleared).toContain('5▼:C');
  expect(sys.cars[1].state).toBe(CarState.OUT_OF_SERVICE);
  expect(sys.cars[1].floor).toBe(4);
  sys.returnToService('B');
  sys.carCall('B', 7);
  expect(run(sys)).toEqual(['B7▲']);                // back in service and moving again
});

test('doors only open when stopped at a floor, and the car never moves with them open', () => {
  const car = new ElevatorCar('A', { floors: 10 });
  car.addStop(3);
  car.step();
  expect(car.state).toBe(CarState.MOVING_UP);
  expect(() => car.openDoors()).toThrow(/moving/);
  const opened = new Set();
  for (let i = 0; i < 20; i++) {
    const wasOpen = car.state === CarState.DOORS_OPEN;
    const before = car.floor;
    const stop = car.step();
    if (wasOpen) expect(car.floor).toBe(before);    // no tick moves a car whose doors were open
    if (car.state === CarState.DOORS_OPEN) opened.add(car.floor);
    if (stop) expect(stop).toEqual({ carId: 'A', floor: 3, dir: Dir.UP });
  }
  expect([...opened]).toEqual([3]);
  expect(car.state).toBe(CarState.IDLE);
});

test('floors outside the building are rejected and cars stay inside it', () => {
  const sys = new ElevatorSystem({ floors: 10, cars: 3, strategy: new NearestCar() });
  expect(() => sys.carCall('A', 10)).toThrow(RangeError);
  expect(() => sys.hallCall(9, Dir.UP)).toThrow(RangeError);
  expect(() => sys.hallCall(0, Dir.DOWN)).toThrow(RangeError);
  let seed = 42;
  const rand = n => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);   // tiny deterministic LCG
  for (let i = 0; i < 2000; i++) {
    if (i % 3 === 0) {
      const floor = rand(10);
      sys.hallCall(floor, floor === 9 || (floor > 0 && rand(2)) ? Dir.DOWN : Dir.UP);
    }
    if (i % 7 === 0) sys.carCall('ABC'[rand(3)], rand(10));
    sys.tick();
    for (const car of sys.cars) {
      expect(car.floor).toBeGreaterThanOrEqual(0);
      expect(car.floor).toBeLessThanOrEqual(9);
    }
  }
  run(sys, Infinity, 500);                          // drain: no presses, every stop gets served
  expect(sys.assigned.size).toBe(0);
  expect(sys.cars.every(c => c.idle)).toBe(true);
});
