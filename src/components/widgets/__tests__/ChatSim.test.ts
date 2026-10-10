import { describe, expect, test } from "vitest";
import { chatReducer, conversation, initChat, nextEventAt, type ChatState } from "../ChatSim";

const settle = (s: ChatState, max = 2_000) => {
  let out = s;
  for (let i = 0; i < max && nextEventAt(out) !== null; i++) out = chatReducer(out, { type: "next" });
  return out;
};
/** Step event by event until `pred` holds. */
const until = (s: ChatState, pred: (s: ChatState) => boolean, max = 500) => {
  let out = s;
  for (let i = 0; i < max && !pred(out); i++) out = chatReducer(out, { type: "next" });
  return out;
};

describe("ChatSim reducer", () => {
  test("happy path: sending → sent → delivered → read", () => {
    let s = chatReducer(initChat(1, { latency: 300, drop: 0 }), { type: "send", from: "alice", text: "hi" });
    expect(s.out.alice[0].status).toBe("sending");
    s = until(s, (x) => x.out.alice[0].status === "sent");
    expect(s.out.alice[0].seq).toBe(1);
    s = until(s, (x) => x.out.alice[0].status === "delivered");
    s = settle(s);
    expect(s.out.alice[0].status).toBe("read");
    expect(s.inbox.bob.map((m) => m.text)).toEqual(["hi"]);
    expect(s.server.msgs).toHaveLength(1);
    expect(s.stats).toEqual({ duplicates: 0, retries: 0, lost: 0 });
  });

  test("a lost ack makes the phone retry; the server ignores the duplicate by clientId", () => {
    let s = chatReducer(initChat(2, { latency: 300, drop: 0 }), { type: "send", from: "alice", text: "pay me back" });
    s = until(s, (x) => x.packets.some((p) => p.kind === "ack"));
    // Force this one ack to be lost.
    s = { ...s, packets: s.packets.map((p) => (p.kind === "ack" ? { ...p, drop: true } : p)) };
    s = settle(s);
    expect(s.stats.lost).toBe(1);
    expect(s.stats.retries).toBe(1);
    expect(s.stats.duplicates).toBe(1);
    expect(s.server.msgs).toHaveLength(1); // stored once
    expect(s.inbox.bob).toHaveLength(1); // delivered once
    expect(s.out.alice[0]).toMatchObject({ status: "read", seq: 1, attempts: 2 });
  });

  test("messages are shown in server sequence order, not arrival order", () => {
    let s = initChat(3, { latency: 200, drop: 0 });
    s = chatReducer(s, { type: "send", from: "alice", text: "first" });
    s = chatReducer(s, { type: "send", from: "alice", text: "second" });
    // Make "first" arrive at the server after "second".
    s = { ...s, packets: s.packets.map((p) => (p.clientId === "a1" ? { ...p, arriveAt: p.arriveAt + 1_000 } : p)) };
    s = settle(s);
    const bob = conversation(s, "bob");
    expect(bob.map((r) => r.text)).toEqual(["second", "first"]);
    expect(bob.map((r) => r.seq)).toEqual([1, 2]);
    expect(conversation(s, "alice").map((r) => r.seq)).toEqual([1, 2]);
  });

  test("Bob offline: the server holds messages and syncs them on reconnect", () => {
    let s = chatReducer(initChat(4, { latency: 250, drop: 0 }), { type: "online", who: "bob", online: false });
    s = chatReducer(s, { type: "send", from: "alice", text: "ping" });
    s = settle(s);
    expect(s.out.alice[0].status).toBe("sent");
    expect(s.inbox.bob).toHaveLength(0);
    expect(s.server.msgs[0].delivered).toBe(false);
    s = settle(chatReducer(s, { type: "online", who: "bob", online: true }));
    expect(s.inbox.bob).toHaveLength(1);
    expect(s.out.alice[0].status).toBe("read");
  });

  test("lossy network: every message is stored exactly once and eventually read", () => {
    let s = initChat(9, { latency: 200, drop: 0.4 });
    for (const text of ["a", "b", "c", "d"]) s = chatReducer(s, { type: "send", from: "alice", text });
    s = chatReducer(s, { type: "send", from: "bob", text: "e" });
    s = settle(s);
    expect(s.server.msgs).toHaveLength(5);
    expect(new Set(s.server.msgs.map((m) => m.clientId)).size).toBe(5);
    expect(s.out.alice.every((m) => m.status === "read")).toBe(true);
    expect(s.out.bob[0].status).toBe("read");
    expect(s.stats.lost).toBeGreaterThan(0);
    expect(s.inbox.bob.map((m) => m.seq)).toEqual([...s.inbox.bob.map((m) => m.seq)].sort((a, b) => a - b));
  });

  test("same seed, same story", () => {
    const run = () => {
      let s = initChat(5, { latency: 300, drop: 0.3 });
      s = chatReducer(s, { type: "send", from: "alice", text: "x" });
      s = chatReducer(s, { type: "send", from: "bob", text: "y" });
      return settle(s).events.map((e) => e.text);
    };
    expect(run()).toEqual(run());
  });
});
