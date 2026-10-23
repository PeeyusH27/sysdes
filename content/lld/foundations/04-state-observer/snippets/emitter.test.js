import { test, expect } from 'vitest';
import { Emitter } from './emitter.js';

test('listeners hear events in the order they subscribed', () => {
  const emitter = new Emitter();
  const heard = [];
  emitter.subscribe((e) => heard.push(`a:${e}`));
  emitter.subscribe((e) => heard.push(`b:${e}`));
  emitter.emit(1);
  expect(heard).toEqual(['a:1', 'b:1']);
});

test('subscribing the same function twice is one subscription, and unsubscribing twice is harmless', () => {
  const emitter = new Emitter();
  const heard = [];
  const fn = (e) => heard.push(e);
  const off = emitter.subscribe(fn);
  emitter.subscribe(fn);
  emitter.emit('x');
  expect(heard).toEqual(['x']);
  off();
  off();
  emitter.emit('y');
  expect(heard).toEqual(['x']);
  expect(emitter.size).toBe(0);
});

test('a listener that unsubscribes another during a notification does not break the loop', () => {
  const emitter = new Emitter();
  const heard = [];
  let offB;
  emitter.subscribe(() => { heard.push('a'); offB(); });
  offB = emitter.subscribe(() => heard.push('b'));
  emitter.emit(1);
  emitter.emit(2);
  expect(heard).toEqual(['a', 'b', 'a']); // b still hears round 1 (the copy), and is gone for round 2
});

test('a throwing listener does not stop the others, and its error is returned', () => {
  const emitter = new Emitter();
  const heard = [];
  emitter.subscribe(() => { throw new Error('boom'); });
  emitter.subscribe((e) => heard.push(e));
  const errors = emitter.emit('x');
  expect(heard).toEqual(['x']);
  expect(errors.map((e) => e.message)).toEqual(['boom']);
});
