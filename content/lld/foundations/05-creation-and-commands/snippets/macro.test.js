import { test, expect } from 'vitest';
import { Doc, Type, Erase, History } from './command.js';
import { Macro } from './macro.js';

test('a macro is one undo step', () => {
  const doc = new Doc();
  const history = new History();
  history.run(new Type(doc, 'hello world'));
  history.run(new Macro([new Erase(doc, 5), new Type(doc, 'there')]));
  expect(doc.text).toBe('hello there');
  history.undo();
  expect(doc.text).toBe('hello world');
  history.redo();
  expect(doc.text).toBe('hello there');
});

test('undo runs the steps in reverse order', () => {
  const log = [];
  const step = (name) => ({ do: () => log.push(`do ${name}`), undo: () => log.push(`undo ${name}`) });
  const macro = new Macro([step('a'), step('b'), step('c')]);
  macro.do();
  macro.undo();
  expect(log).toEqual(['do a', 'do b', 'do c', 'undo c', 'undo b', 'undo a']);
});
