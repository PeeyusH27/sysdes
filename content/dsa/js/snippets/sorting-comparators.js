// Comparator contract: negative = a first, positive = b first, 0 = tie.

// Returning a boolean is a bug: true/false become 1/0, never negative.
console.log([3, 1, 2].sort((a, b) => a > b));         // [3, 1, 2] in V8 (Chrome, Node): nothing moved

// a - b only works for numbers. On strings it is NaN, which counts as a tie.
console.log(['pear', 'fig', 'apple'].sort((a, b) => a - b)); // ['pear', 'fig', 'apple']

// A three-way compare works for numbers, strings and BigInts alike.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
console.log(['pear', 'fig', 'apple'].sort(cmp));      // ['apple', 'fig', 'pear']
console.log([3n, 1n, 2n].sort(cmp));                  // [1n, 2n, 3n]  (a - b would throw a TypeError here)
console.log(['b', 'C', 'a'].sort((a, b) => a.localeCompare(b))); // ['a', 'b', 'C']: dictionary order

// Descending: swap the arguments, or negate the result.
console.log(['fig', 'apple', 'pear'].sort((a, b) => cmp(b, a))); // ['pear', 'fig', 'apple']
