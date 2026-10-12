// Template 1: sort, then match greedily. Each child needs a cookie of at least greed[i]; each cookie feeds one child.
// Walk the cookies smallest first and give each one to the least greedy child still waiting, if it is big enough.
export function findContentChildren(greed, cookies) {
  const g = [...greed].sort((a, b) => a - b);
  const c = [...cookies].sort((a, b) => a - b);
  let child = 0;
  for (let i = 0; i < c.length && child < g.length; i++) {
    if (c[i] >= g[child]) child++; // feed this child; a too-small cookie is useless to everyone left
  }
  return child;
}
