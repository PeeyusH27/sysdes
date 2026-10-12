// Counting numbers in an object: every key is turned into a string.
const nums = [3, -1, 3, 10, 2];
const count = {};
for (const n of nums) count[n] = (count[n] ?? 0) + 1;
console.log(count);                           // { '2': 1, '3': 2, '10': 1, '-1': 1 }
console.log(Object.keys(count));              // ['2', '3', '10', '-1']: strings, not numbers
console.log(Object.keys(count).includes(3));  // false: 3 !== '3'
console.log(Object.keys(count).map(Number));  // [2, 3, 10, -1]: convert back yourself
console.log(count[3] === count['3']);         // true: obj[3] and obj['3'] are the same key

// Key order: integer-like keys first, ascending; then the rest in insertion order.
// That is why 2, 3 and 10 jumped ahead while '-1' (not integer-like) stayed last.

// Arrays and objects used as keys are stringified too.
const visited = {};
visited[[1, 2]] = true;                       // key '1,2'
visited[{ r: 0 }] = true;
visited[{ r: 5 }] = true;                     // the same key as the line above
console.log(Object.keys(visited));            // ['1,2', '[object Object]']

// A Map keeps number keys as numbers, in insertion order.
const m = new Map();
for (const n of nums) m.set(n, (m.get(n) ?? 0) + 1);
console.log([...m.keys()]);                   // [3, -1, 10, 2]
