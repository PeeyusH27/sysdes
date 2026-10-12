const seen = new Set([3, 1, 3, 2, 1]);
console.log(seen, seen.size);              // Set(3) { 3, 1, 2 } 3: duplicates collapse
console.log(seen.has(2), seen.has(5));     // true false: O(1) average membership test
seen.add(5).add(5);                        // adding again does nothing
seen.delete(3);
console.log([...seen]);                    // [1, 2, 5]

// Deduplicate an array (keeps first-seen order).
console.log([...new Set(['b', 'a', 'b', 'c', 'a'])]); // ['b', 'a', 'c']

// Set algebra with plain loops (works in every engine).
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5]);
console.log([...a].filter((x) => b.has(x)));  // intersection [3, 4]
console.log([...new Set([...a, ...b])]);      // union [1, 2, 3, 4, 5]
console.log([...a].filter((x) => !b.has(x))); // difference [1, 2]
