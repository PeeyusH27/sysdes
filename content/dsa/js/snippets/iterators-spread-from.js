// Spread drains any iterable into an array (or into function arguments).
const set = new Set([3, 1, 3, 2]);
console.log([...set], Math.max(...set));                   // [3, 1, 2] 3
console.log([...'abc'], [...new Map([[1, 'one']])]);       // ['a', 'b', 'c'] [[1, 'one']]

// Array.from(iterable, mapFn) converts and transforms in one pass.
const freq = new Map([['a', 2], ['b', 5]]);
console.log(Array.from(freq, ([ch, n]) => ch.repeat(n)));  // ['aa', 'bbbbb']

// It also accepts { length: n }, which is how you build ranges and grids.
console.log(Array.from({ length: 5 }, (_, i) => i * i));   // [0, 1, 4, 9, 16]
const grid = Array.from({ length: 2 }, () => new Array(3).fill(0));
grid[0][0] = 1;
console.log(grid);                                         // [[1, 0, 0], [0, 0, 0]]: rows are separate

// Objects and Maps convert both ways.
const asMap = new Map(Object.entries({ x: 1, y: 2 }));
console.log(asMap.get('y'), Object.fromEntries(asMap));    // 2 { x: 1, y: 2 }
