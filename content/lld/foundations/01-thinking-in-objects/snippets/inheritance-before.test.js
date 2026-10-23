import { expect, test } from 'vitest';
import { Car, ElectricCar, fillUp } from './inheritance-before.js';

test('code written against Car breaks when an ElectricCar is passed in', () => {
  expect(fillUp([new Car('KA01')])).toEqual(['KA01: petrol in the tank']);
  expect(() => fillUp([new Car('KA01'), new ElectricCar('KA02')])).toThrow('no tank');
});
