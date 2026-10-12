// Arrays and objects are compared by reference, so they make useless keys:
const visited = new Set();
visited.add([0, 1]);
console.log(visited.has([0, 1]));        // false: a different array object

// Encode the coordinates as a string (or a number) instead.
const key = (r, c) => `${r},${c}`;
visited.add(key(0, 1));
console.log(visited.has(key(0, 1)));     // true

// For a grid with known width, a number key is faster than a string.
const cols = 1000;
const id = (r, c) => r * cols + c;
const seen = new Set([id(2, 7)]);
console.log(seen.has(id(2, 7)), id(2, 7)); // true 2007
