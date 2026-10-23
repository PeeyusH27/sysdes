function calcEquation(equations, values, queries) {
  // Each equation a / b = k is an edge a -> b of weight k and an edge b -> a of weight 1 / k.
  const graph = new Map();
  const link = (from, to, weight) => {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from).push([to, weight]);
  };
  equations.forEach(([a, b], i) => {
    link(a, b, values[i]);
    link(b, a, 1 / values[i]);
  });

  // Multiply the weights along a path from start to goal.
  const evaluate = (start, goal) => {
    if (!graph.has(start) || !graph.has(goal)) return -1;
    const seen = new Set([start]);
    const stack = [[start, 1]];
    while (stack.length > 0) {
      const [node, product] = stack.pop();
      if (node === goal) return product;
      for (const [next, weight] of graph.get(node)) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push([next, product * weight]);
      }
    }
    return -1; // different components
  };

  return queries.map(([c, d]) => evaluate(c, d));
}
