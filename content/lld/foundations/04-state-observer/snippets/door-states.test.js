import { test, expect } from 'vitest';
import { Door } from './door-states.js';

test('walks the legal path and reports the action for each step', () => {
  const door = new Door();
  const steps = ['open', 'close', 'lock', 'unlock'].map((e) => door.send(e));
  expect(steps.map((s) => s.state)).toEqual(['open', 'closed', 'locked', 'closed']);
  expect(steps.map((s) => s.action)).toEqual(['swing open', 'latch', 'throw bolt', 'retract bolt']);
});

test('an illegal event is rejected and changes nothing', () => {
  const door = new Door();
  expect(door.send('close')).toEqual({ ok: false, state: 'closed' });
  door.send('open');
  expect(door.send('lock')).toEqual({ ok: false, state: 'open' });
  door.send('close');
  door.send('lock');
  expect(door.send('open')).toEqual({ ok: false, state: 'locked' });
});

test('an unknown event, even one named like a state method, is just rejected', () => {
  const door = new Door();
  expect(door.send('toString')).toEqual({ ok: false, state: 'closed' });
  expect(door.send('name')).toEqual({ ok: false, state: 'closed' });
});
