class Node {
  constructor(val, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

function buildGraph(adjList) {
  const nodes = adjList.map((_, i) => new Node(i + 1));
  adjList.forEach((list, i) => list.forEach((v) => nodes[i].neighbors.push(nodes[v - 1])));
  return nodes.length ? nodes[0] : null;
}

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

function cloneNode(node) {
  if (node === null) return null;
  const copies = new Map(); // original node -> its copy
  const copyOf = (original) => {
    if (copies.has(original)) return copies.get(original); // already copied: reuse it (this also stops cycles)
    const copy = new Node(original.val);
    copies.set(original, copy); // register BEFORE visiting neighbours
    for (const nb of original.neighbors) copy.neighbors.push(copyOf(nb));
    return copy;
  };
  return copyOf(node);
}

function cloneGraph(adjList) {
  const original = buildGraph(adjList);
  const copy = cloneNode(original);
  if (original !== null && copy === original) throw new Error("cloneNode returned the original node, not a copy");
  return toAdjList(copy);
}
