import { expect, test } from 'vitest';
import { countPaths, countPathsOneRow } from './grid-paths.js';

const open3x3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
const centreWall = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];

test('counts right/down paths around walls', () => {
  for (const fn of [countPaths, countPathsOneRow]) {
    expect(fn(open3x3)).toBe(6);
    expect(fn(centreWall)).toBe(2);
    expect(fn([[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]])).toBe(3);
  }
});

test('handles single cells and blocked corners', () => {
  for (const fn of [countPaths, countPathsOneRow]) {
    expect(fn([[0]])).toBe(1);
    expect(fn([[1]])).toBe(0);
    expect(fn([[1, 0], [0, 0]])).toBe(0); // the start is a wall
    expect(fn([[0, 0], [0, 1]])).toBe(0); // the finish is a wall
    expect(fn([[0, 0, 0, 0, 0]])).toBe(1);
  }
});
