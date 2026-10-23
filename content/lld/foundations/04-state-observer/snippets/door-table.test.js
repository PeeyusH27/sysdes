import { test, expect } from 'vitest';
import { Door } from './door-table.js';

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
  expect(door.send('lock')).toEqual({ ok: false, state: 'open' }); // the case the flags version allowed
  door.send('close');
  door.send('lock');
  expect(door.send('open')).toEqual({ ok: false, state: 'locked' });
});

test('every one of the 12 state and event pairs has exactly one outcome', () => {
  const reach = { closed: [], open: ['open'], locked: ['lock'] }; // events that bring a new door to each state
  let accepted = 0;
  for (const state of Object.keys(reach)) {
    for (const event of ['open', 'close', 'lock', 'unlock']) {
      const door = new Door();
      reach[state].forEach((e) => door.send(e));
      accepted += door.send(event).ok ? 1 : 0;
    }
  }
  expect(accepted).toBe(4);
});

test('an unknown event, even one named like an object method, is just rejected', () => {
  expect(new Door().send('toString')).toEqual({ ok: false, state: 'closed' });
});
