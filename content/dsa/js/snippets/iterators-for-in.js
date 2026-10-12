// for...in walks the enumerable STRING keys of an object.
const scores = { ann: 9, bo: 7 };
for (const name in scores) console.log(name, scores[name]); // ann 9, bo 7

// On arrays it gives indices as strings, which breaks arithmetic.
const nums = [10, 20, 30];
for (const i in nums) console.log(i + 1, typeof i);         // 01 string, 11 string, 21 string

// for...of gives values; entries() gives numeric indices with them.
for (const [i, x] of nums.entries()) console.log(i + 1, x);  // 1 10, 2 20, 3 30

// Integer-like keys come first in ascending order, whatever order you inserted them.
const obj = { b: 1, 10: 'x', a: 2, 2: 'y' };
console.log(Object.keys(obj));                               // ['2', '10', 'b', 'a']
