// Intervals by start, then by end: || moves on to the next key only on a tie (0).
const intervals = [[5, 8], [1, 4], [1, 2], [3, 9]];
intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
console.log(intervals);                                  // [[1, 2], [1, 4], [3, 9], [5, 8]]

// By frequency (descending), then by value (ascending).
const nums = [4, 1, 2, 2, 3, 3, 3, 4];
const count = new Map();
for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
const byFreq = [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a - b);
console.log(byFreq);                                     // [3, 2, 4, 1]

// Longest word first, ties alphabetical.
const words = ['kiwi', 'fig', 'banana', 'apple', 'date'];
console.log(words.sort((a, b) => b.length - a.length || a.localeCompare(b))); // ['banana', 'apple', 'date', 'kiwi', 'fig']

// Sort indices by the values they point to, leaving the data where it is.
const heights = [160, 150, 175, 155];
const order = heights.map((_, i) => i).sort((i, j) => heights[i] - heights[j]);
console.log(order);                                      // [1, 3, 0, 2]

// Stable since ES2019: ties keep their original relative order.
const tasks = [['write', 2], ['test', 1], ['ship', 2], ['plan', 1]];
console.log(tasks.toSorted((a, b) => a[1] - b[1]).map(([name]) => name)); // ['test', 'plan', 'write', 'ship']
