// 1. Braces after => start a block: no return, no value.
const broken = [1, 2].map((x) => { x * 2; });
console.log(broken[0], broken[1]);              // undefined undefined
console.log([1, 2].map((x) => x * 2));          // [2, 4]: no braces returns the expression

// 2. A recursive helper whose result is not returned.
function contains(node, target) {
  if (!node) return false;
  if (node.val === target) return true;
  contains(node.next, target);           // bug: the answer is thrown away
}
function containsFixed(node, target) {
  if (!node) return false;
  return node.val === target || containsFixed(node.next, target);
}
const list = { val: 1, next: { val: 2, next: null } };
console.log(contains(list, 2), containsFixed(list, 2)); // undefined true

// 3. Classes need new.
class Counter {
  count = 0;
}
try {
  Counter();
} catch (e) {
  console.log(e.name);                   // TypeError
}

// 4. Deep recursion overflows the stack around 10^4 levels.
const depth = (n) => (n === 0 ? 0 : 1 + depth(n - 1));
try {
  depth(1e5);
} catch (e) {
  console.log(e.message);                // Maximum call stack size exceeded
}
