const scores = [72, 95, 64, 88, 100, 53];

// A chain reads well, but each step is a full pass that builds a new array.
const curvedTotal = scores.filter((s) => s >= 60).map((s) => s + 5).reduce((a, b) => a + b, 0);
console.log(curvedTotal);                     // 444

// One loop: one pass, no intermediate arrays, and several results at once.
let total = 0, passed = 0, best = -Infinity;
for (const s of scores) {
  if (s < 60) continue;
  total += s + 5;
  passed++;
  if (s > best) best = s;
}
console.log(total, passed, best);             // 444 5 100

// A hidden nested loop: includes inside filter is O(n * m).
const a = [1, 2, 3, 4, 5, 6];
const b = [4, 5, 6, 7];
console.log(a.filter((x) => b.includes(x)));  // [4, 5, 6]: O(n * m)
const inB = new Set(b);
console.log(a.filter((x) => inB.has(x)));     // [4, 5, 6]: O(n + m)
