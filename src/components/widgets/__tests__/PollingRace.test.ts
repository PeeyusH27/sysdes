import { test, expect } from "vitest";
import { makeEvents, simulatePolling } from "../PollingRace";

test("makeEvents is deterministic per seed and stays inside the run", () => {
  const a = makeEvents(11, 6);
  expect(makeEvents(11, 6)).toEqual(a);
  expect(a.length).toBeGreaterThan(0);
  expect(a.every((t) => t > 0 && t < 59_000)).toBe(true);
  expect([...a].sort((x, y) => x - y)).toEqual(a);
});

test("short polling: requests = ceil(duration / interval), delay bounded by the interval", () => {
  const [short] = simulatePolling([1_000, 12_000, 30_100], { interval: 5_000, latency: 50 });
  expect(short.requestCount).toBe(12);
  // event at 1 s is picked up by the poll sent at 5 s (arrives 5.05 s, answer 5.1 s)
  expect(short.deliveries[0]).toEqual({ event: 1_000, at: 5_100 });
  expect(short.deliveries[2]).toEqual({ event: 30_100, at: 35_100 });
  expect(short.maxDelay).toBeLessThanOrEqual(5_000 + 100);
  expect(short.emptyCount).toBe(9);
});

test("long polling answers on the event, then re-asks", () => {
  const [, long] = simulatePolling([1_000, 12_000], { latency: 50, timeout: 30_000 });
  expect(long.deliveries).toEqual([
    { event: 1_000, at: 1_050 },
    { event: 12_000, at: 12_050 },
  ]);
  // 0→1.05 s, 1.05→12.05 s, then one empty 30 s timeout, then another that runs past 60 s
  expect(long.requests.map((r) => r.empty)).toEqual([false, false, true, true]);
  expect(long.requestCount).toBe(4);
});

test("an event in the gap between long polls is answered as soon as the next poll arrives", () => {
  const [, long] = simulatePolling([1_000, 1_020], { latency: 50 });
  // the first event is answered at 1.0 s; the second happens before the next poll arrives (1.1 s)
  expect(long.deliveries[1]).toEqual({ event: 1_020, at: 1_150 });
});

test("SSE and WebSocket push every event after one-way latency over a single connection", () => {
  const lanes = simulatePolling([20, 5_000], { latency: 50 });
  for (const lane of lanes.slice(2)) {
    expect(lane.requestCount).toBe(1);
    expect(lane.deliveries).toEqual([
      { event: 20, at: 100 }, // before the stream is open: waits until the request has arrived
      { event: 5_000, at: 5_050 },
    ]);
  }
});

test("push beats long polling beats short polling on average delay", () => {
  const lanes = simulatePolling(makeEvents(3, 10), { interval: 5_000 });
  const [short, long, sse, ws] = lanes.map((l) => l.avgDelay);
  expect(sse).toBe(ws);
  expect(sse).toBeLessThanOrEqual(long);
  expect(long).toBeLessThan(short);
});
