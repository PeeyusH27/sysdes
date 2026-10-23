import { test, expect } from "vitest";
import { findDeadlock, initLocks, ORDERS, play, stepThread, waitingFor } from "../DeadlockLab";

const opposite = ORDERS.opposite.map((o) => [...o]);
const same = ORDERS.same.map((o) => [...o]);

test("a thread takes a free lock and moves on", () => {
  const s = stepThread(initLocks(opposite), 0);
  expect(s.holder).toEqual({ A: 0, B: null });
  expect(s.pc).toEqual([1, 0]);
});

test("opposite lock orders deadlock when the threads alternate", () => {
  // T1 takes A, T2 takes B, T1 wants B, T2 wants A
  const s = play(opposite, [0, 1, 0, 1]);
  expect(s.status).toEqual(["waiting", "waiting"]);
  expect(waitingFor(s, 0)).toBe("B");
  expect(waitingFor(s, 1)).toBe("A");
  expect(findDeadlock(s)?.slice().sort()).toEqual([0, 1]);
});

test("opposite orders are fine when one thread runs to the end first: deadlock needs the unlucky interleaving", () => {
  const s = play(opposite, [0, 0, 0, 1, 1, 1]);
  expect(s.status).toEqual(["done", "done"]);
  expect(findDeadlock(s)).toBeNull();
});

test("the same lock order cannot deadlock: the second thread just waits for the first lock", () => {
  let s = initLocks(same);
  for (let i = 0; i < 12; i++) s = stepThread(stepThread(s, 0), 1);
  expect(s.status).toEqual(["done", "done"]);
  expect(findDeadlock(play(same, [0, 1, 0, 1]))).toBeNull();
});

test("a thread waiting on a lock another thread will release is not a deadlock", () => {
  const s = play(same, [0, 1]); // T1 holds A, T2 waits for A
  expect(s.status).toEqual(["running", "waiting"]);
  expect(findDeadlock(s)).toBeNull();
});

test("a done thread releases everything it held", () => {
  const s = play(opposite, [0, 0, 0]);
  expect(s.holder).toEqual({ A: null, B: null });
});
