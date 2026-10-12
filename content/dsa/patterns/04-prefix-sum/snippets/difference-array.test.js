import { expect, test } from 'vitest';
import { applyRangeAdds } from './difference-array.js';

test('applies many range additions with one final pass', () => {
  expect(applyRangeAdds(6, [[1, 3, 2], [2, 5, 3], [0, 1, -1]])).toEqual([-1, 1, 5, 5, 3, 3]);
  expect(applyRangeAdds(4, [[0, 3, 1], [0, 3, 1]])).toEqual([2, 2, 2, 2]);
});

test('single cells and no updates', () => {
  expect(applyRangeAdds(3, [[2, 2, 5]])).toEqual([0, 0, 5]);
  expect(applyRangeAdds(3, [])).toEqual([0, 0, 0]);
});
