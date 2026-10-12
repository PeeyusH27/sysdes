// How deep can this engine recurse? Recurse until the stack overflows, then report.
function probe(depth) {
  try {
    return probe(depth + 1);
  } catch {
    return depth;
  }
}
console.log('max depth here:', probe(0)); // around 10000 (Node 24: ~9000), varies by engine

// What the overflow looks like: a RangeError you can catch, not a crash.
const countDown = (n) => (n === 0 ? 0 : countDown(n - 1));
try {
  countDown(1e6);
} catch (e) {
  console.log(e instanceof RangeError, e.message); // true Maximum call stack size exceeded
}
console.log(countDown(1000));                      // 0: a depth of 1000 is fine everywhere

// Tail position does not help: only Safari implements tail-call optimisation.
function sumTo(n, acc = 0) {
  if (n === 0) return acc;
  return sumTo(n - 1, acc + n);          // a tail call, still a new frame in V8 and Firefox
}
try {
  console.log(sumTo(1e6));
} catch (e) {
  console.log(e.name);                   // RangeError (Safari prints 500000500000)
}
