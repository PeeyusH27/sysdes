const nums = [4, 1, 3];
let sum = 0;
for (let i = 0; i < nums.length; i++) {
  sum += nums[i];
  console.log({ i, sum });               // an object literal labels every value
}
// { i: 0, sum: 4 }  { i: 1, sum: 5 }  { i: 2, sum: 8 }

// Maps and Sets print their contents directly; spread them to see entries as arrays.
const freq = new Map([['a', 2], ['b', 1]]);
console.log('freq', freq, [...freq]);    // freq Map(2) { 'a' => 2, 'b' => 1 } [['a', 2], ['b', 1]]

// JSON.stringify gives one compact line for nested arrays (great for grids and DP tables)...
const grid = [[1, 0], [0, 1]];
console.log(JSON.stringify(grid));       // [[1,0],[0,1]]
grid.forEach((row) => console.log(row.join(' '))); // one row per line: 1 0, then 0 1

// ...but it loses Maps and Sets, which come out as {}.
console.log(JSON.stringify({ freq, seen: new Set([1]) })); // {"freq":{},"seen":{}}

// Logging is slow: print a few iterations, not all 10^5.
for (let i = 0; i < 100000; i++) if (i < 2) console.log('iteration', i); // iteration 0, iteration 1
