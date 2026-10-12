// Every mask from 0 to 2^n - 1 is one subset: bit i says whether items[i] is in it.
const items = ['a', 'b', 'c'];
const n = items.length;
const subsets = [];
for (let mask = 0; mask < 1 << n; mask++) {
  const subset = [];
  for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(items[i]);
  subsets.push(subset.join('') || '-');
}
console.log(subsets);                    // ['-', 'a', 'b', 'ab', 'c', 'ac', 'bc', 'abc']

// A mask as a tiny "visited" set (state compression in DP over subsets, n up to about 20).
let visited = 0;
visited |= 1 << 3;
visited |= 1 << 0;
console.log((visited & (1 << 3)) !== 0, (visited & (1 << 2)) !== 0); // true false
const ALL = (1 << 4) - 1;                // 0b1111: every one of 4 nodes
console.log(visited === ALL, (visited | 0b0110) === ALL);           // false true

// Every non-empty submask of a mask, largest first.
const mask = 0b1011;
const subs = [];
for (let s = mask; s > 0; s = (s - 1) & mask) subs.push(s.toString(2));
console.log(subs);                       // ['1011', '1010', '1001', '1000', '11', '10', '1']
