function findItinerary(tickets) {
  // airport -> its destinations, sorted so that pop() returns the smallest remaining one
  const graph = new Map();
  for (const [from, to] of tickets) {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from).push(to);
  }
  for (const dests of graph.values()) dests.sort().reverse();

  const route = [];
  const visit = (airport) => {
    const dests = graph.get(airport);
    while (dests && dests.length > 0) visit(dests.pop()); // fly the smallest unused ticket
    route.push(airport); // written only when this airport has no tickets left
  };
  visit("JFK");
  return route.reverse();
}
