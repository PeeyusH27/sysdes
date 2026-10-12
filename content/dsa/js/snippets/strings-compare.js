// < and > compare UTF-16 code units, one character at a time.
console.log('apple' < 'banana', 'app' < 'apple'); // true true: a prefix sorts first
console.log('Zebra' < 'apple');                   // true: all uppercase letters come before lowercase
console.log('10' < '9', 10 < 9);                  // true false: digits compared as characters

// The default sort uses the same code-unit order; localeCompare gives dictionary order.
const words = ['banana', 'Cherry', 'apple'];
console.log([...words].sort());                                // ['Cherry', 'apple', 'banana']
console.log([...words].sort((a, b) => a.localeCompare(b)));    // ['apple', 'banana', 'Cherry']
console.log('Hello'.toLowerCase() === 'hELLO'.toLowerCase());  // true: case-insensitive equality

// Sorted characters: the classic anagram key, O(k log k) per word.
const key = (w) => [...w].sort().join('');
console.log(key('listen'), key('listen') === key('silent'));   // eilnst true

// Template literals build composite keys and readable output.
const r = 2, c = 5;
console.log(`${r},${c}`, `cell (${r}, ${c}) = ${r * c}`);      // 2,5 cell (2, 5) = 10
