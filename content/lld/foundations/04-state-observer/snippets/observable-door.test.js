import { test, expect } from 'vitest';
import { ObservableDoor } from './observable-door.js';

test('listeners hear every legal transition and nothing for rejected ones', () => {
  const door = new ObservableDoor();
  const heard = [];
  door.subscribe((e) => heard.push(e));
  door.send('open');
  door.send('lock'); // illegal while open
  door.send('close');
  expect(heard).toEqual([
    { from: 'closed', event: 'open', to: 'open' },
    { from: 'open', event: 'close', to: 'closed' },
  ]);
});

test('a listener that reads the door sees the new state', () => {
  const door = new ObservableDoor();
  const seen = [];
  door.subscribe(() => seen.push(door.state));
  door.send('open');
  door.send('close');
  expect(seen).toEqual(['open', 'closed']);
});

test('a throwing listener neither undoes the move nor stops other listeners', () => {
  const door = new ObservableDoor();
  const heard = [];
  door.subscribe(() => { throw new Error('alarm offline'); });
  door.subscribe((e) => heard.push(e.to));
  const result = door.send('lock');
  expect(result.ok).toBe(true);
  expect(door.state).toBe('locked');
  expect(heard).toEqual(['locked']);
  expect(result.errors.map((e) => e.message)).toEqual(['alarm offline']);
});

test('an unsubscribed listener hears nothing more', () => {
  const door = new ObservableDoor();
  const heard = [];
  const off = door.subscribe((e) => heard.push(e.to));
  door.send('open');
  off();
  door.send('close');
  expect(heard).toEqual(['open']);
});
