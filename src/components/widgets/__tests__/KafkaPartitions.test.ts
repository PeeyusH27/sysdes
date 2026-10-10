import { test, expect } from "vitest";
import { initTopic, keySpread, partitionForKey, produce, rangeAssign, topicStep, type TopicState } from "../KafkaPartitions";

test("range assignor: contiguous runs, extras to the first consumers", () => {
  expect(rangeAssign(4, 3)).toEqual([[0, 1], [2], [3]]);
  expect(rangeAssign(6, 4)).toEqual([[0, 1], [2, 3], [4], [5]]);
  expect(rangeAssign(8, 2)).toEqual([
    [0, 1, 2, 3],
    [4, 5, 6, 7],
  ]);
});

test("consumers beyond the partition count are idle", () => {
  const a = rangeAssign(3, 5);
  expect(a).toEqual([[0], [1], [2], [], []]);
  expect(a.flat().sort()).toEqual([0, 1, 2]); // every partition owned exactly once
});

test("every partition is assigned exactly once for all sizes", () => {
  for (let p = 1; p <= 8; p++)
    for (let c = 1; c <= 10; c++) {
      const flat = rangeAssign(p, c).flat();
      expect(flat).toEqual(Array.from({ length: p }, (_, i) => i));
    }
});

test("keyed producing: a key always maps to the same partition", () => {
  for (const key of ["user-1", "user-2", "user-3"]) expect(partitionForKey(key, 4)).toBe(partitionForKey(key, 4));
  let s: TopicState = initTopic(3);
  for (let i = 0; i < 60; i++) s = produce(s, "keyed", 4);
  const spread = keySpread(s.messages);
  for (const ps of Object.values(spread)) expect(ps).toHaveLength(1);
  // per key, sequence numbers are in order within that partition
  for (const key of Object.keys(spread)) {
    const seqs = s.messages.filter((m) => m.key === key).map((m) => m.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
  }
});

test("round-robin spreads one key over several partitions", () => {
  let s: TopicState = initTopic(3);
  for (let i = 0; i < 40; i++) s = produce(s, "round-robin", 4);
  expect(s.messages.map((m) => m.partition).slice(0, 8)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  expect(Object.values(keySpread(s.messages)).some((ps) => ps.length > 1)).toBe(true);
});

test("produce is pure and deterministic (RNG state lives in the topic state)", () => {
  const a = produce(initTopic(9), "keyed", 4);
  const b = produce(initTopic(9), "keyed", 4);
  expect(a).toEqual(b);
  expect(a.rng).not.toBe(initTopic(9).rng);
});

test("topicStep produces one message every 700 ms after the first at 400 ms", () => {
  let s = initTopic();
  for (let i = 0; i < 40; i++) s = topicStep(s, 50, "keyed", 4); // 2 s
  expect(s.messages).toHaveLength(3); // at 0.4, 1.1 and 1.8 s
});
