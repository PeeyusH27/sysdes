import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { connect } from './ws-client.js';

class FakeSocket {
  static OPEN = 1;
  static all = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeSocket.all.push(this);
  }
  send(data) { this.sent.push(data); }
  close() { this.drop(); }
  // test helpers
  accept() { this.readyState = 1; this.onopen?.(); }
  drop() { this.readyState = 3; this.onclose?.(); }
  receive(obj) { this.onmessage?.({ data: JSON.stringify(obj) }); }
}

beforeEach(() => {
  FakeSocket.all = [];
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('parses messages and only sends while open', () => {
  const got = [];
  const conn = connect('wss://x', (m) => got.push(m));
  expect(conn.send({ hi: 1 })).toBe(false);            // still connecting
  FakeSocket.all[0].accept();
  expect(conn.send({ hi: 1 })).toBe(undefined);        // ws.send returns undefined once it is open
  expect(FakeSocket.all[0].sent).toEqual(['{"hi":1}']);
  FakeSocket.all[0].receive({ text: 'yo' });
  expect(got).toEqual([{ text: 'yo' }]);
});

test('reconnects with a growing, jittered delay and resets after a successful open', async () => {
  connect('wss://x', () => {});
  FakeSocket.all[0].drop();                            // attempt 0: 0.5 × 500 ms = 250 ms
  await vi.advanceTimersByTimeAsync(249);
  expect(FakeSocket.all).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(FakeSocket.all).toHaveLength(2);

  FakeSocket.all[1].drop();                            // attempt 1: 0.5 × 1 s = 500 ms
  await vi.advanceTimersByTimeAsync(499);
  expect(FakeSocket.all).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(FakeSocket.all).toHaveLength(3);

  FakeSocket.all[2].accept();                          // success resets the backoff
  FakeSocket.all[2].drop();
  await vi.advanceTimersByTimeAsync(250);
  expect(FakeSocket.all).toHaveLength(4);
});

test('close() cancels a pending reconnect', async () => {
  const conn = connect('wss://x', () => {});
  FakeSocket.all[0].drop();                            // reconnect scheduled in 250 ms
  conn.close();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(FakeSocket.all).toHaveLength(1);
});
