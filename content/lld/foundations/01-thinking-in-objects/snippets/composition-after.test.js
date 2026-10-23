import { expect, test } from 'vitest';
import { Battery, Hybrid, Petrol, Vehicle } from './composition-after.js';

test('every vehicle answers refill(), whatever it runs on', () => {
  const fleet = [new Vehicle('KA01', new Petrol()), new Vehicle('KA02', new Battery())];
  expect(fleet.map((v) => v.refill())).toEqual(['KA01: petrol in the tank', 'KA02: plugged in']);
});

test('a hybrid is a new part, not a new branch of the hierarchy', () => {
  expect(new Vehicle('KA03', new Hybrid()).refill()).toBe('KA03: petrol in the tank + KA03: plugged in');
});
