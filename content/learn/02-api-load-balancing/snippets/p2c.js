// Power of two choices. Sample two servers, use the less loaded one.
// Nearly as good as least-connections, with no global scan or shared state.
export function pickP2C(servers, rand = Math.random) {
  const healthy = servers.filter(s => s.healthy);
  if (healthy.length < 2) return healthy[0];
  const a = healthy[Math.floor(rand() * healthy.length)];
  let b = healthy[Math.floor(rand() * (healthy.length - 1))];
  if (b === a) b = healthy[healthy.length - 1];             // guarantees b !== a, uniformly
  return a.active <= b.active ? a : b;
}
