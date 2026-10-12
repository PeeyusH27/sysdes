// Weighted directed edges [from, to, weight] -> adjacency list of [neighbour, weight].
const n = 4;
const edges = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 5]];
const graph = Array.from({ length: n }, () => []);
for (const [u, v, w] of edges) graph[u].push([v, w]);
for (const [v, w] of graph[0]) console.log(`0 -> ${v} costs ${w}`); // 0 -> 1 costs 4, 0 -> 2 costs 1

// Adjacency matrix: O(1) "is there an edge?" and weight lookups, but n² memory.
const INF = Infinity;
const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
for (const [u, v, w] of edges) dist[u][v] = Math.min(dist[u][v], w); // keep the cheapest parallel edge
console.log(dist[0]);                    // [0, 4, 1, Infinity]

// Floyd-Warshall in five lines: all-pairs shortest paths through the matrix, O(n³).
for (let k = 0; k < n; k++)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
console.log(dist[0]);                    // [0, 3, 1, 8]: 0 -> 2 -> 1 beats the direct edge
