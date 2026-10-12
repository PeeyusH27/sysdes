// Roughly how many operations per second does this engine manage? Run a few kinds of work.
function rate(label, n, work) {
  work(1000);                            // warm up so the JIT compiles the loop first
  const start = performance.now();
  work(n);
  const seconds = (performance.now() - start) / 1000;
  console.log(label.padEnd(26), (n / seconds).toExponential(0), 'per second');
}
rate('arithmetic in a loop', 2e7, (n) => {
  let s = 0;
  for (let i = 0; i < n; i++) s += i % 7;
  return s;
});
rate('array reads and writes', 2e6, (n) => {
  const a = new Array(n).fill(0);
  for (let i = 1; i < n; i++) a[i] = a[i - 1] + 1;
  return a;
});
rate('Map get + set, number keys', 1e6, (n) => {
  const m = new Map();
  for (let i = 0; i < n; i++) m.set(i, (m.get(i) ?? 0) + 1); // a million distinct keys
  return m;
});
rate('Set add, string keys', 3e5, (n) => {
  const s = new Set();
  for (let i = 0; i < n; i++) s.add(`${i},${i + 1}`);
  return s;
});
// Node 24 on a laptop (your numbers will differ, the ordering won't):
// arithmetic in a loop       2e+9 per second
// array reads and writes     5e+8 per second
// Map get + set, number keys 3e+7 per second
// Set add, string keys       7e+6 per second
