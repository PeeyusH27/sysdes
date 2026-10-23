import { expect, test } from 'vitest';
import { Rectangle, Square, areaAt4By5 } from './lsp-before.js';

test('the same call gives a different answer for the subclass', () => {
  expect(areaAt4By5(new Rectangle(1, 1))).toBe(20);
  expect(areaAt4By5(new Square(1))).toBe(25);
});
