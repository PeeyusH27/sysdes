const nums = [3, 1, 4, 1, 5];

console.log(nums.map((x) => x * 2));               // [6, 2, 8, 2, 10]
console.log(nums.filter((x) => x % 2 === 1));      // [3, 1, 1, 5]
console.log(nums.map((x, i) => x * i));            // [0, 1, 8, 3, 20]: callbacks also get the index

// reduce folds the array into one value. Always pass the initial value.
console.log(nums.reduce((sum, x) => sum + x, 0));  // 14
const freq = nums.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
console.log(freq);                                 // Map(4) { 3 => 1, 1 => 2, 4 => 1, 5 => 1 }

// Without an initial value, the first ELEMENT becomes the accumulator...
const pairs = [[1, 'a'], [2, 'b']];
console.log(pairs.reduce((acc, [n]) => acc + n));    // 1,a2: acc started as the array [1, 'a']
console.log(pairs.reduce((acc, [n]) => acc + n, 0)); // 3
// ...and an empty array throws.
try {
  [].reduce((a, b) => a + b);
} catch (e) {
  console.log(e.name);                             // TypeError
}

// map calls fn(value, index, array): parseInt takes the index as its radix.
console.log(['1', '2', '3'].map(parseInt));        // [1, NaN, NaN]
console.log(['1', '2', '3'].map(Number));          // [1, 2, 3]
