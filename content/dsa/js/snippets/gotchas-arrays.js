// 1. fill([]) puts ONE array in every row.
const bad = new Array(3).fill([]);
bad[0].push('x');
console.log(bad);                        // [['x'], ['x'], ['x']]
const good = Array.from({ length: 3 }, () => []); // a new row per slot
good[0].push('x');
console.log(good);                       // [['x'], [], []]

// 2. sort() without a comparator compares numbers as strings.
console.log([10, 9, 1, 100].sort());                  // [1, 10, 100, 9]
console.log([10, 9, 1, 100].sort((a, b) => a - b));  // [1, 9, 10, 100]

// 3. Arrays compare by reference.
console.log([1, 2] === [1, 2]);          // false
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
console.log(same([1, 2], [1, 2]));       // true

// 4. Math.max of nothing is -Infinity (and Math.min is Infinity).
const empty = [];
console.log(Math.max(...empty), empty.length ? Math.max(...empty) : 0); // -Infinity 0

// 5. map(parseInt) passes the index as the radix.
console.log(['1', '2', '3'].map(parseInt)); // [1, NaN, NaN]
console.log(['1', '2', '3'].map(Number));   // [1, 2, 3]

// 6. const stops reassignment, not mutation.
const fixed = [1, 2];
fixed.push(3);                           // allowed
console.log(fixed);                      // [1, 2, 3]
