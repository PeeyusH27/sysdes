const a = [10, 20, 30, 40, 50];

// slice(start, end) COPIES a range and leaves the original alone.
console.log(a.slice(1, 3), a.slice(-2));    // [20, 30] [40, 50]
console.log(a);                             // [10, 20, 30, 40, 50]

// splice(start, deleteCount, ...items) MUTATES and returns what it removed.
const removed = a.splice(1, 2);             // remove 2 items starting at index 1
console.log(removed, a);                    // [20, 30] [10, 40, 50]
a.splice(1, 0, 15, 17);                     // insert at index 1, removing nothing
console.log(a);                             // [10, 15, 17, 40, 50]
a.splice(-1);                               // remove from the last index to the end
console.log(a);                             // [10, 15, 17, 40]

// Spread and concat make new (shallow) arrays.
const b = [1, 2];
console.log([...b, 3], b.concat([4, 5]), b); // [1, 2, 3] [1, 2, 4, 5] [1, 2]

// Non-mutating twins (ES2023): toReversed, toSorted, toSpliced, with.
console.log(b.toReversed(), b.with(0, 99), b.toSpliced(0, 1), b); // [2, 1] [99, 2] [2] [1, 2]
