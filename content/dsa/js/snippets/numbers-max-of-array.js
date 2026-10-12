const small = [3, -1, 7, 2];
console.log(Math.max(...small), Math.min(...small)); // 7 -1
console.log(Math.max(), Math.min());                 // -Infinity Infinity: what an empty array gives

// Spreading passes every element as a separate argument, and engines cap the argument count.
const huge = Array.from({ length: 1_000_000 }, (_, i) => i);
try {
  console.log(Math.max(...huge));
} catch (e) {
  console.log(e.name);                               // RangeError
}

// A loop (or reduce) handles any length, still in O(n).
let best = -Infinity;
for (const x of huge) if (x > best) best = x;
console.log(best);                                   // 999999
console.log(huge.reduce((m, x) => (x > m ? x : m), -Infinity)); // 999999
