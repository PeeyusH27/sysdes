// N replicas; a write waits for W acks, a read asks R replicas and keeps the newest version
export const quorum = (N, W, R) => ({
  strong: R + W > N,               // every read set overlaps the latest write set
  writeTolerates: N - W,           // replicas that can be down while writes still succeed
  readTolerates: N - R,
});
// quorum(3, 2, 2) → { strong: true, writeTolerates: 1, readTolerates: 1 }
// quorum(3, 1, 1) → strong: false (fast, but a read can be stale)
// quorum(5, 3, 2) → strong: false (3 + 2 is not greater than 5)

// Consensus (Raft, Paxos) needs a majority to elect a leader and commit
export const majority = (n) => Math.floor(n / 2) + 1;
export const failuresTolerated = (n) => n - majority(n);
// 3 nodes → majority 2, tolerates 1 · 4 nodes → majority 3, still tolerates 1 · 5 nodes → tolerates 2
