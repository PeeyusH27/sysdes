import { test, expect } from 'vitest';
import { Replica, deliver } from './rga.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('typing builds the text; deleting hides a character without forgetting it', () => {
  const a = new Replica(1);
  'cat'.split('').forEach((ch, i) => a.insertAt(i, ch));
  expect(a.text()).toBe('cat');
  a.deleteAt(0);
  expect(a.text()).toBe('at');
  expect(a.nodes).toHaveLength(3);                       // the tombstone stays, so late inserts after "c" still find their place
});

test('the "cats" example without any transformation: concurrent append and delete merge', () => {
  const a = new Replica(1);
  const setup = 'cat'.split('').map((ch, i) => a.insertAt(i, ch));
  const b = new Replica(2);
  deliver(b, setup);
  const opA = a.insertAt(3, 's');                        // A: "cats"
  const opB = b.deleteAt(0);                             // B: "at", at the same moment
  deliver(a, [opB]);
  deliver(b, [opA]);
  expect(a.text()).toBe('ats');
  expect(b.text()).toBe('ats');
});

test('two inserts at the same spot end up in the same order on both replicas', () => {
  const a = new Replica(1);
  const b = new Replica(2);
  const base = a.insertAt(0, 'x');
  deliver(b, [base]);
  const opA = a.insertAt(1, 'A');
  const opB = b.insertAt(1, 'B');
  deliver(a, [opB]);
  deliver(b, [opA]);
  expect(a.text()).toBe(b.text());
  expect(a.text()).toHaveLength(3);
});

test('delivery order and duplicates do not matter: 100 random runs with 3 replicas converge', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const r = rng(seed);
    const reps = [1, 2, 3].map((s) => new Replica(s));
    const log = [[], [], []];                            // each replica's own operations, in order
    for (let step = 0; step < 40; step++) {
      const i = Math.floor(r() * 3);
      const rep = reps[i];
      // sometimes learn about another replica's first few operations before editing, so the edits are not all independent
      if (r() < 0.3) { const j = Math.floor(r() * 3); deliver(rep, log[j].slice(0, Math.floor(r() * (log[j].length + 1)))); }
      const len = rep.text().length;
      log[i].push(len > 0 && r() < 0.35 ? rep.deleteAt(Math.floor(r() * len)) : rep.insertAt(Math.floor(r() * (len + 1)), 'abcdef'[Math.floor(r() * 6)]));
    }
    const everything = log.flat();
    for (const rep of reps) {
      const shuffled = [...everything, ...everything.slice(0, 5)].sort(() => r() - 0.5);   // random order, some duplicates
      expect(deliver(rep, shuffled), `seed ${seed}`).toBe(0);
    }
    expect(reps[1].text(), `seed ${seed}`).toBe(reps[0].text());
    expect(reps[2].text(), `seed ${seed}`).toBe(reps[0].text());
  }
});

test('the cost of the design: tombstones keep the structure growing', () => {
  const a = new Replica(1);
  for (let i = 0; i < 100; i++) a.insertAt(i, 'x');
  for (let i = 0; i < 100; i++) a.deleteAt(0);
  expect(a.text()).toBe('');
  expect(a.nodes).toHaveLength(100);                     // an empty document that still remembers 100 characters
});
