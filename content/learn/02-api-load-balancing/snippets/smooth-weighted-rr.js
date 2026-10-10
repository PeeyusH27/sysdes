// nginx's smooth weighted round robin
// weights { a: 5, b: 1, c: 1 } → a a b a c a a (spread out, not a burst of five a's)
export function createWeightedPicker(servers) {            // [{ url, weight }]
  const state = servers.map(s => ({ ...s, current: 0 }));
  const total = state.reduce((n, s) => n + s.weight, 0);
  return function pick() {
    let best = null;
    for (const s of state) {
      s.current += s.weight;
      if (!best || s.current > best.current) best = s;
    }
    best.current -= total;
    return best.url;
  };
}
