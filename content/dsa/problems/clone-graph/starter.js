class Node {
  constructor(val, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

/** Builds the graph described by adjList (node i + 1 has neighbours adjList[i]) and returns node 1, or null. */
function buildGraph(adjList) {
  const nodes = adjList.map((_, i) => new Node(i + 1));
  adjList.forEach((list, i) => list.forEach((v) => nodes[i].neighbors.push(nodes[v - 1])));
  return nodes.length ? nodes[0] : null;
}

/** Reads a graph back into an adjacency list (index = val - 1), keeping each neighbour order. */
function toAdjList(start) {
  const byVal = new Map();
  const stack = start ? [start] : [];
  while (stack.length) {
    const node = stack.pop();
    if (byVal.has(node.val)) continue;
    byVal.set(node.val, node.neighbors.map((nb) => nb.val));
    for (const nb of node.neighbors) stack.push(nb);
  }
  return Array.from({ length: byVal.size }, (_, i) => byVal.get(i + 1));
}

/**
 * Write this: return a deep copy of the graph that contains `node` (null for no graph).
 * @param {Node | null} node
 * @return {Node | null}
 */
function cloneNode(node) {
  
}

// The tests call this one. Keep it as is.
function cloneGraph(adjList) {
  const original = buildGraph(adjList);
  const copy = cloneNode(original);
  if (original !== null && copy === original) throw new Error("cloneNode returned the original node, not a copy");
  return toAdjList(copy);
}
