import { test, expect } from 'vitest';
import { Doc, Type, Erase, History } from './command.js';

test('undo reverses the last edit and redo replays it', () => {
  const doc = new Doc();
  const history = new History();
  history.run(new Type(doc, 'hello'));
  history.run(new Type(doc, ' world'));
  expect(doc.text).toBe('hello world');
  expect(history.undo()).toBe(true);
  expect(doc.text).toBe('hello');
  expect(history.redo()).toBe(true);
  expect(doc.text).toBe('hello world');
});

test('erase restores exactly what it removed, even when count was too big', () => {
  const doc = new Doc();
  const history = new History();
  history.run(new Type(doc, 'ab'));
  history.run(new Erase(doc, 5));
  expect(doc.text).toBe('');
  history.undo();
  expect(doc.text).toBe('ab');
});

test('nothing to undo or redo returns false', () => {
  const history = new History();
  expect(history.undo()).toBe(false);
  expect(history.redo()).toBe(false);
});

test('a new edit clears the redo stack', () => {
  const doc = new Doc();
  const history = new History();
  history.run(new Type(doc, 'a'));
  history.run(new Type(doc, 'b'));
  history.undo();
  history.run(new Type(doc, 'x'));
  expect(history.redo()).toBe(false);
  expect(doc.text).toBe('ax');
});
