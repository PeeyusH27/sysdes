// Time a function. Exact numbers depend on the machine; the ratios are the point.
function time(label, fn) {
  const start = performance.now();
  fn();
  console.log(label.padEnd(28), Math.round(performance.now() - start), 'ms');
}
const n = 20000;
const nums = Array.from({ length: n }, (_, i) => (i * 7919) % n); // n distinct values, shuffled

// 1. includes() inside a loop is a hidden inner loop: O(n²).
time('dedupe with includes', () => {
  const out = [];
  for (const x of nums) if (!out.includes(x)) out.push(x);
});
time('dedupe with a Set', () => {
  const seen = new Set();
  for (const x of nums) seen.add(x);
});

// 2. Spreading into a new array each step copies everything so far: O(n²).
time('grow with [...out, x]', () => {
  let out = [];
  for (const x of nums) out = [...out, x];
});
time('grow with push', () => {
  const out = [];
  for (const x of nums) out.push(x);
});

// 3. A string you append to AND read from (here: its last character) is copied again and again.
time('s += ch, reading s.at(-1)', () => {
  let s = '';
  let repeats = 0;
  for (let i = 0; i < n * 5; i++) {
    if (s.at(-1) === 'a') repeats++;     // reading forces V8 to flatten (copy) the string
    s += 'a';
  }
});
time('chars array, join once', () => {
  const chars = [];
  let repeats = 0;
  for (let i = 0; i < n * 5; i++) {
    if (chars.at(-1) === 'a') repeats++;
    chars.push('a');
  }
  chars.join('');
});
// Node 24 on a laptop:
// dedupe with includes         ~30 ms
// dedupe with a Set            ~1 ms
// grow with [...out, x]        ~270 ms
// grow with push               ~0 ms
// s += ch, reading s.at(-1)    ~140 ms
// chars array, join once       ~1 ms
