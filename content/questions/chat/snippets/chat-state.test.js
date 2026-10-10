import { describe, expect, test } from 'vitest';
import { reconnectDelay, typingThrottle, upsertMessage } from './chat-state.js';

const apply = (...events) => events.reduce(upsertMessage, []);

describe('upsertMessage', () => {
  test('an ack upgrades the optimistic bubble in place', () => {
    const list = apply(
      { clientId: 'a', text: 'hi', from: 'me', status: 'sending' },
      { clientId: 'a', seq: 7, status: 'sent' },                   // the ack carries only clientId + seq
    );
    expect(list).toEqual([{ clientId: 'a', text: 'hi', from: 'me', seq: 7, status: 'sent' }]);
  });

  test('our own echo never duplicates the message, whether it arrives before or after the ack', () => {
    const sending = { clientId: 'a', text: 'hi', status: 'sending' };
    const ack = { clientId: 'a', seq: 7, status: 'sent' };
    const echo = { type: 'message', conversationId: 'c1', clientId: 'a', seq: 7, from: 'u1', text: 'hi', status: 'sent' };
    expect(apply(sending, ack, echo)).toHaveLength(1);
    expect(apply(sending, echo, ack)).toHaveLength(1);
    expect(apply(sending, echo, ack)[0]).toMatchObject({ seq: 7, status: 'sent', from: 'u1' });
  });

  test('a message replayed by sync is merged, not appended', () => {
    const m = { clientId: 'b', seq: 3, from: 'bob', text: 'yo', status: 'sent' };
    expect(apply(m, { ...m }, { ...m })).toHaveLength(1);
  });

  test('sorts by seq, with unsent messages last in the order they were sent', () => {
    const list = apply(
      { clientId: 'x', text: 'first unsent', status: 'sending' },
      { clientId: 'b5', seq: 5, text: 'five', status: 'sent' },
      { clientId: 'y', text: 'second unsent', status: 'sending' },
      { clientId: 'b3', seq: 3, text: 'three (arrived late)', status: 'sent' },
    );
    expect(list.map(m => m.clientId)).toEqual(['b3', 'b5', 'x', 'y']);
  });

  test('an acked message moves from the unsent tail into its seq position', () => {
    const list = apply(
      { clientId: 'b4', seq: 4, status: 'sent' },
      { clientId: 'x', status: 'sending' },
      { clientId: 'b6', seq: 6, status: 'sent' },
      { clientId: 'x', seq: 5, status: 'sent' },                   // ack for x
    );
    expect(list.map(m => m.seq)).toEqual([4, 5, 6]);
  });

  test('messages without a clientId are matched by seq and never collapse into each other', () => {
    const list = apply({ seq: 1, text: 'system: joined' }, { seq: 2, text: 'system: renamed' }, { seq: 1, text: 'system: joined' });
    expect(list.map(m => m.seq)).toEqual([1, 2]);
  });

  test('never mutates the previous state (React relies on a new array)', () => {
    const before = [{ clientId: 'a', status: 'sending' }];
    const snapshot = structuredClone(before);
    const after = upsertMessage(before, { clientId: 'a', seq: 1, status: 'sent' });
    expect(before).toEqual(snapshot);
    expect(after).not.toBe(before);
  });
});

describe('reconnectDelay', () => {
  test('grows exponentially up to the cap', () => {
    const max = () => 1;                                           // the top of the random range
    expect(reconnectDelay(0, max)).toBe(1_000);
    expect(reconnectDelay(3, max)).toBe(8_000);
    expect(reconnectDelay(5, max)).toBe(30_000);                   // 32 s capped to 30 s
    expect(reconnectDelay(20, max)).toBe(30_000);
  });

  test('full jitter spreads clients between 0 and the cap', () => {
    expect(reconnectDelay(4, () => 0)).toBe(0);
    expect(reconnectDelay(4, () => 0.5)).toBe(8_000);              // half of 16 s
    for (let i = 0; i < 100; i++) {
      const d = reconnectDelay(10);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(30_000);
    }
  });
});

describe('typingThrottle', () => {
  test('sends at most one typing event every 3 s', () => {
    let t = 0;
    const sent = [];
    const typing = typingThrottle(() => sent.push(t), { now: () => t });
    for (t = 0; t <= 7_000; t += 500) typing();                   // a keystroke every 500 ms for 7 s
    expect(sent).toEqual([0, 3_000, 6_000]);
  });
});
