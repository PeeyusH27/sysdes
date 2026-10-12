// Functions are values: pass them in to customise what a generic helper does.
function countIf(items, test) {
  let n = 0;
  for (const x of items) if (test(x)) n++;
  return n;
}
console.log(countIf([3, 8, 1, 10], (x) => x > 2)); // 3

// A function that builds a comparator: sort people by one computed key.
const byKey = (key) => (a, b) => key(a) - key(b);
const people = [{ name: 'Ann', age: 31 }, { name: 'Bo', age: 25 }, { name: 'Cy', age: 28 }];
people.sort(byKey((p) => p.age));
console.log(people.map((p) => p.name));  // ['Bo', 'Cy', 'Ann']

// Binary search on the answer: the predicate is the only problem-specific part.
function firstTrue(lo, hi, ok) {         // smallest x in [lo, hi] with ok(x) true
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
console.log(firstTrue(0, 100, (x) => x * x >= 50)); // 8: the smallest x with x² >= 50

// Passing a method directly loses its object; wrap it in an arrow.
const seen = new Set();
try {
  [1, 2].forEach(seen.add);
} catch (e) {
  console.log(e.name);                   // TypeError: add was called without its Set
}
[1, 2].forEach((x) => seen.add(x));
console.log(seen);                       // Set(2) { 1, 2 }
