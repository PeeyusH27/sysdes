function findCheapestPrice(n, flights, src, dst, k) {
  // Bellman-Ford limited to k + 1 rounds: after round r, cost[v] is the cheapest
  // price to reach v using at most r + 1 flights (that is, at most r stops).
  let cost = new Array(n).fill(Infinity);
  cost[src] = 0;
  for (let round = 0; round <= k; round++) {
    const next = cost.slice();              // read last round's prices, write this round's
    for (const [from, to, price] of flights) {
      if (cost[from] + price < next[to]) next[to] = cost[from] + price;
    }
    cost = next;
  }
  return cost[dst] === Infinity ? -1 : cost[dst];
}
