import { expect, test } from 'vitest';
import { Card, Cash, refundAll } from './isp-before.js';

test('a stub that throws turns one bad entry into a crash for the whole batch', () => {
  expect(refundAll([new Card()], 100)).toEqual(['sent 100 back to the card']);
  expect(() => refundAll([new Card(), new Cash()], 100)).toThrow('refunded at the desk');
});
