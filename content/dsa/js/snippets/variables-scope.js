// const by default, let when the variable must change. Both are block-scoped.
const nums = [3, 1, 2];
nums.push(4);                       // allowed: const blocks reassignment, not mutation
console.log(nums);                  // [3, 1, 2, 4]

let best = -Infinity;
for (const x of nums) {
  const doubled = x * 2;            // a fresh variable each iteration, gone after the block
  if (doubled > best) best = doubled;
}
console.log(best, typeof doubled);  // 8 undefined: doubled doesn't exist out here

// var ignores blocks: one variable for the whole function, visible after the loop.
function loopCounterAfterLoop() {
  for (var i = 0; i < 3; i++) {}
  return i;
}
console.log(loopCounterAfterLoop()); // 3

// Closures made in a loop: let gives each iteration its own i, var shares one j.
const withLet = [];
for (let i = 0; i < 3; i++) withLet.push(() => i);
const withVar = [];
for (var j = 0; j < 3; j++) withVar.push(() => j);
console.log(withLet.map((f) => f()), withVar.map((f) => f())); // [0, 1, 2] [3, 3, 3]
