import { describe, expect, test } from "vitest";
import { heal, initRaft, killLeader, leaderOf, MAJORITY, partitionNode, stepRaft, type RaftState } from "../RaftElection";

/** Run in 50 ms ticks, checking the safety property at every step: at most one leader per term. */
function run(s: RaftState, ms: number, leadersByTerm = new Map<number, Set<number>>()) {
  let out = s;
  for (let t = 0; t < ms; t += 50) {
    out = stepRaft(out, 50);
    for (const n of out.nodes) {
      if (n.role !== "leader") continue;
      const set = leadersByTerm.get(n.term) ?? new Set<number>();
      set.add(n.id);
      leadersByTerm.set(n.term, set);
    }
  }
  for (const [term, ids] of leadersByTerm) expect(ids.size, `term ${term}`).toBe(1);
  return out;
}

describe("Raft election", () => {
  test("a leader emerges from five followers, with a majority of votes", () => {
    const s = run(initRaft(), 12_000);
    const l = leaderOf(s);
    expect(l).not.toBeNull();
    expect(l!.votes.length).toBeGreaterThanOrEqual(MAJORITY);
    expect(s.nodes.filter((n) => n.role === "follower" && n.term === l!.term && n.leaderId === l!.id).length).toBe(4);
  });

  test("killing the leader elects a new one in a higher term", () => {
    let s = run(initRaft(7), 12_000);
    const first = leaderOf(s)!;
    s = run(killLeader(s), 15_000);
    const second = leaderOf(s);
    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(first.id);
    expect(second!.term).toBeGreaterThan(first.term);
  });

  test("a partitioned follower keeps bumping its term; healing forces a new election that settles", () => {
    let s = run(initRaft(3), 12_000);
    const leaderTerm = leaderOf(s)!.term;
    s = partitionNode(s);
    const cut = s.nodes.find((n) => n.cut)!;
    s = run(s, 20_000);
    expect(s.nodes[cut.id].term).toBeGreaterThan(leaderTerm + 2); // term inflation while isolated
    expect(leaderOf(s)!.term).toBe(leaderTerm); // the majority side never noticed
    const inflated = s.nodes[cut.id].term;
    s = run(heal(s), 20_000);
    const l = leaderOf(s);
    expect(l).not.toBeNull();
    expect(l!.term).toBeGreaterThanOrEqual(inflated); // the higher term won out
  });

  test("two of five down still elects; three down cannot", () => {
    let s = run(initRaft(11), 12_000);
    s = run(killLeader(s), 15_000);
    s = run(killLeader(s), 15_000);
    expect(leaderOf(s)).not.toBeNull(); // 3 of 5 alive
    s = run(killLeader(s), 20_000);
    expect(leaderOf(s)).toBeNull(); // 2 of 5: no majority
  });

  test("deterministic for a seed", () => {
    const a = run(initRaft(9), 10_000);
    const b = run(initRaft(9), 10_000);
    expect(a.nodes).toEqual(b.nodes);
  });
});
