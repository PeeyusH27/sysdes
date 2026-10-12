// Turn an edge list into an adjacency list once, up front: adj[u] is the array of u's neighbours, so
// looping over a node's neighbours costs O(its degree) instead of a scan over every edge.
export function buildAdjacency(n, edges, directed = false) {
  const adj = Array.from({ length: n }, () => []); // n separate arrays (not fill([]), which shares one)
  for (const [a, b] of edges) {
    adj[a].push(b);
    if (!directed) adj[b].push(a);                 // an undirected edge is stored in both directions
  }
  return adj;
}

// When nodes are strings or sparse numbers ("JFK", 10^9), key a Map by node instead of using an array.
export function buildAdjacencyMap(edges, directed = false) {
  const adj = new Map();
  const add = (from, to) => {
    if (!adj.has(from)) adj.set(from, []);
    if (to !== undefined) adj.get(from).push(to);
  };
  for (const [a, b] of edges) {
    add(a, b);
    if (directed) add(b);                          // make sure sinks exist as keys too
    else add(b, a);
  }
  return adj;
}
