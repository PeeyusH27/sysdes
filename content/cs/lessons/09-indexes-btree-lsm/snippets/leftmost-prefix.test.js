import { test, expect } from 'vitest';
import { isCovering, usableColumns } from './leftmost-prefix.js';

const index = ['user_id', 'status', 'created_at'];

test('equality on the first two columns and a range on the third uses all three', () => {
  expect(usableColumns(index, { equals: ['user_id', 'status'], range: ['created_at'] })).toBe(3);
});

test('skipping the first column makes the index useless for narrowing: the leftmost-prefix rule', () => {
  expect(usableColumns(index, { equals: ['status'], range: ['created_at'] })).toBe(0);
});

test('a gap stops the prefix: user_id and created_at uses only user_id', () => {
  expect(usableColumns(index, { equals: ['user_id'], range: ['created_at'] })).toBe(1);
});

test('a range on an earlier column ends the prefix, so later equalities cannot narrow', () => {
  expect(usableColumns(index, { equals: ['status'], range: ['user_id'] })).toBe(1);
});

test('column order matters: equality columns first, the range column last', () => {
  expect(usableColumns(['created_at', 'user_id'], { equals: ['user_id'], range: ['created_at'] })).toBe(1);
  expect(usableColumns(['user_id', 'created_at'], { equals: ['user_id'], range: ['created_at'] })).toBe(2);
});

test('a covering index contains every column the query reads', () => {
  expect(isCovering(index, ['user_id', 'status'])).toBe(true);
  expect(isCovering(index, ['user_id', 'total'])).toBe(false);
});
