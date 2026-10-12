import { lcsString } from './two-strings.js'; // @hide
import { knapsack01, knapsackUnbounded, knapsackItems } from './knapsack.js'; // @hide
// The shared-row trap: fill() evaluates its argument ONCE, so every row is the same array.
const shared = new Array(3).fill(new Array(4).fill(0));
shared[0][1] = 7;
console.log(shared.map((row) => row.join(' ')).join(' | ')); // 0 7 0 0 | 0 7 0 0 | 0 7 0 0

// Array.from calls the factory once per row: independent rows.
const table = Array.from({ length: 3 }, () => new Array(4).fill(0));
table[0][1] = 7;
console.log(table.map((row) => row.join(' ')).join(' | ')); // 0 7 0 0 | 0 0 0 0 | 0 0 0 0

// Two strings, with the answer rebuilt from the table.
console.log(lcsString('CLOUD', 'COLD'));                     // CLD

// Same items, two loop directions.
console.log(knapsack01([2, 3], [3, 5], 6), knapsackUnbounded([2, 3], [3, 5], 6)); // 8 10
console.log(knapsackItems([3, 2, 2], [5, 3, 3], 4));          // { best: 6, items: [1, 2] }
