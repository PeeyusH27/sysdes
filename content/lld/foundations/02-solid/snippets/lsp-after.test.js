import { expect, test } from 'vitest';
import { Rectangle, Square, totalArea } from './lsp-after.js';

test('any shape works wherever an area is needed', () => {
  expect(totalArea([new Rectangle(4, 5), new Square(3)])).toBe(29);
});

test('resizing a rectangle returns a new one and leaves the original alone', () => {
  const r = new Rectangle(2, 3);
  expect(r.withWidth(4).area()).toBe(12);
  expect(r.area()).toBe(6);
});
