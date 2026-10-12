const zeros = new Array(5).fill(0);
console.log(zeros);                                 // [0, 0, 0, 0, 0]
const idx = Array.from({ length: 5 }, (_, i) => i);
console.log(idx);                                   // [0, 1, 2, 3, 4]
const squares = Array.from({ length: 4 }, (_, i) => i * i);
console.log(squares);                               // [0, 1, 4, 9]
console.log(Array.from('abc'), Array.from(new Set([3, 3, 1]))); // ['a', 'b', 'c'] [3, 1]

// new Array(n) alone makes n HOLES: empty slots that map, forEach and reduce skip.
const holes = new Array(3);
let visits = 0;
holes.forEach(() => visits++);
console.log(holes.length, 0 in holes, visits);      // 3 false 0
console.log(new Array(3).fill(0).map((_, i) => i * 10)); // [0, 10, 20]: fill first, then map

// A single number means "length". Array.of always means "these items".
console.log(new Array(3).length, Array.of(3), Array.of(3, 4)); // 3 [3] [3, 4]

// length is writable: shrink to truncate, set to 0 to clear in place.
const a = [1, 2, 3, 4];
a.length = 2;
console.log(a);                                     // [1, 2]
a.length = 0;
console.log(a);                                     // []
