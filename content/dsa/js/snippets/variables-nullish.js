// undefined: nothing was ever put here. null: deliberately empty.
const arr = [10, 20];
const obj = { a: 1 };
function noReturn() {}
let notSet;
console.log(arr[5], obj.b, noReturn(), notSet); // undefined undefined undefined undefined

// Tree and list nodes use null for "no child" and "end of list".
const leaf = { val: 4, left: null, right: null };
const root = { val: 2, left: leaf, right: null };

// ?. returns undefined instead of throwing when the left side is null or undefined.
console.log(root.left?.val, root.right?.val);   // 4 undefined
console.log(root.right?.left?.val);             // undefined
try {
  console.log(root.right.val);                  // throws: no ?. and right is null
} catch (e) {
  console.log(e.name);                          // TypeError
}

// ?? falls back only on null/undefined. || falls back on every falsy value, 0 included.
const counts = { x: 0 };
console.log(counts.x || 10, counts.x ?? 10);    // 10 0
console.log(counts.y || 10, counts.y ?? 10);    // 10 10

// ??= assigns only when the value is missing: a one-line default.
const memo = {};
memo.k ??= 0;
memo.k += 5;
memo.k ??= 100;                                 // ignored: k is already 5
console.log(memo);                              // { k: 5 }
