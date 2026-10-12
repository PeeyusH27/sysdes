function eventualSafeNodes(graph) {
  const n = graph.length;
  const parents = Array.from({ length: n }, () => []); // the edges reversed
  const outdegree = new Array(n).fill(0);
  for (let u = 0; u < n; u++) {
    outdegree[u] = graph[u].length;
    for (const v of graph[u]) parents[v].push(u);
  }

  const queue = [];
  for (let u = 0; u < n; u++) if (outdegree[u] === 0) queue.push(u); // terminal nodes are safe
  const safe = new Array(n).fill(false);
  for (let head = 0; head < queue.length; head++) {
    const v = queue[head];
    safe[v] = true;
    for (const u of parents[v]) {
      outdegree[u]--;
      if (outdegree[u] === 0) queue.push(u); // every edge out of u now leads to a safe node
    }
  }

  const result = [];
  for (let u = 0; u < n; u++) if (safe[u]) result.push(u);
  return result;
}
