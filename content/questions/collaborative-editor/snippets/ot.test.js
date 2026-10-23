import { test, expect } from 'vitest';
import { apply, del, insert, transform } from './ot.js';
import { Client, Server } from './ot-session.js';

// Deterministic random numbers.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}
const randomOp = (r, doc, site) => {
  if (doc.length > 0 && r() < 0.4) return del(Math.floor(r() * doc.length), site);
  return insert(Math.floor(r() * (doc.length + 1)), 'abcdefghij'[Math.floor(r() * 10)], site);
};

test('the "cats" example: A appends s, B deletes c, and both end at "ats"', () => {
  const a = insert(3, 's', 1);                       // "cat" -> "cats"
  const b = del(0, 2);                               // "cat" -> "at"
  const viaA = apply(apply('cat', a), transform(b, a));
  const viaB = apply(apply('cat', b), transform(a, b));
  expect(viaA).toBe('ats');
  expect(viaB).toBe('ats');
  expect(transform(a, b)).toEqual(insert(2, 's', 1));    // the insert shifted left by one
});

test('two inserts at the same position are ordered by site id, the same way on both sides', () => {
  const a = insert(1, 'X', 1);
  const b = insert(1, 'Y', 2);
  expect(apply(apply('ab', a), transform(b, a))).toBe('aXYb');
  expect(apply(apply('ab', b), transform(a, b))).toBe('aXYb');
});

test('both users delete the same character: it is deleted once', () => {
  const a = del(1, 1);
  const b = del(1, 2);
  expect(transform(a, b)).toEqual({ type: 'noop' });
  expect(apply(apply('abc', a), transform(b, a))).toBe('ac');
});

test('TP1 holds for 5,000 random pairs of operations on random documents', () => {
  const r = rng(42);
  for (let i = 0; i < 5000; i++) {
    const doc = Array.from({ length: Math.floor(r() * 6) }, () => 'abcdefghij'[Math.floor(r() * 10)]).join('');
    const a = randomOp(r, doc, 1);
    const b = randomOp(r, doc, 2);
    const left = apply(apply(doc, a), transform(b, a));
    const right = apply(apply(doc, b), transform(a, b));
    expect(left, `doc=${doc} a=${JSON.stringify(a)} b=${JSON.stringify(b)}`).toBe(right);
  }
});

// Three clients edit at random while messages arrive late and out of step between them (but in order per link).
function simulate(seed, clients = 3, edits = 25) {
  const r = rng(seed);
  const server = new Server();
  const cs = Array.from({ length: clients }, (_, i) => new Client(i + 1));
  const up = cs.map(() => []);                       // client -> server messages
  const down = cs.map(() => []);                     // server -> client messages
  let left = edits * clients;
  const choices = () => {
    const out = [];
    if (left > 0) cs.forEach((_, i) => out.push(['edit', i]));
    cs.forEach((_, i) => { if (up[i].length) out.push(['up', i]); if (down[i].length) out.push(['down', i]); });
    return out;
  };
  for (let step = choices(); step.length; step = choices()) {
    const [kind, i] = step[Math.floor(r() * step.length)];
    if (kind === 'edit') {
      left--;
      const msg = cs[i].local(randomOp(r, cs[i].doc, cs[i].site));
      if (msg) up[i].push(msg);
    } else if (kind === 'up') {
      const { op, baseRev } = up[i].shift();
      const res = server.receive(op, baseRev);
      cs.forEach((_, j) => down[j].push(j === i ? { ack: true, rev: res.rev } : { op: res.op, rev: res.rev }));
    } else {
      const m = down[i].shift();
      if (m.ack) { const next = cs[i].ack(m.rev); if (next) up[i].push(next); } else cs[i].remote(m.op, m.rev);
    }
  }
  return { server, cs };
}

test('3 clients, random edits, random message timing: every copy converges to the server document (200 runs)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { server, cs } = simulate(seed);
    for (const c of cs) expect(c.doc, `seed ${seed}`).toBe(server.doc);
  }
});

test('the user sees their own edit immediately, before any server round trip', () => {
  const c = new Client(1);
  c.local(insert(0, 'h', 1));
  c.local(insert(1, 'i', 1));
  expect(c.doc).toBe('hi');
  expect(c.inflight).toEqual(insert(0, 'h', 1));        // one in flight
  expect(c.buffer).toEqual([insert(1, 'i', 1)]);        // the rest wait their turn
});
