// Edge list -> adjacency list. Nodes are 0 .. n-1.
const n = 5;
const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];

// Undirected: store each edge in both directions.
const undirected = Array.from({ length: n }, () => []); // one separate array per node
for (const [u, v] of edges) {
  undirected[u].push(v);
  undirected[v].push(u);
}
console.log(undirected);                 // [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3]]

// Directed: only u -> v. Count in-degrees while you are at it (used by topological sort).
const directed = Array.from({ length: n }, () => []);
const indegree = new Array(n).fill(0);
for (const [u, v] of edges) {
  directed[u].push(v);
  indegree[v]++;
}
console.log(directed, indegree);         // [[1, 2], [3], [3], [4], []] [0, 1, 1, 2, 1]

// Labels that are strings (or sparse numbers): use a Map and create lists on demand.
const flights = [['JFK', 'SFO'], ['JFK', 'ATL'], ['SFO', 'ATL']];
const routes = new Map();
for (const [from, to] of flights) {
  if (!routes.has(from)) routes.set(from, []);
  routes.get(from).push(to);
}
console.log(routes, routes.get('ATL') ?? []); // Map(2) { 'JFK' => ['SFO', 'ATL'], 'SFO' => ['ATL'] } []

// The classic bug: fill([]) puts the SAME array in every slot.
const shared = new Array(3).fill([]);
shared[0].push(9);
console.log(shared);                     // [[9], [9], [9]]
