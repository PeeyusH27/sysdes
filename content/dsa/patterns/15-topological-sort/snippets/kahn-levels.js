// Template 3: Kahn's algorithm one round at a time. Each round takes every node whose in-degree is 0 right now,
// e.g. every course you can take this semester. Returns the rounds (arrays of nodes), or null on a cycle.
// The number of rounds is the number of nodes on the longest dependency chain.
export function topoLevels(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (const [from, to] of edges) {
    adj[from].push(to);
    indegree[to]++;
  }
  let round = [];
  for (let v = 0; v < n; v++) if (indegree[v] === 0) round.push(v);
  const rounds = [];
  let placed = 0;
  while (round.length > 0) {
    rounds.push(round);
    placed += round.length;
    const next = [];
    for (const u of round) {
      for (const v of adj[u]) {
        indegree[v]--;
        if (indegree[v] === 0) next.push(v); // its last prerequisite was in this round
      }
    }
    round = next;
  }
  return placed === n ? rounds : null;
}
