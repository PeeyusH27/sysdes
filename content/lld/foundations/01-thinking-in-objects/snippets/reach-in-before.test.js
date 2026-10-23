import { expect, test } from 'vitest';
import { Member, borrowAtDesk, borrowAtKiosk } from './reach-in-before.js';

test('the kiosk path walks straight past the limit', () => {
  const m = new Member(1);
  expect(borrowAtDesk(m, 'a')).toBe(true);
  expect(borrowAtDesk(m, 'b')).toBe(false);
  expect(borrowAtKiosk(m, 'b')).toBe(true);
  expect(m.loans).toEqual(['a', 'b']); // two loans, limit one
});
