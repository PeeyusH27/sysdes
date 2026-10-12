const a = [1, 2];
const b = [3, 4];
console.log([...a, ...b], [0, ...a, 9]);          // [1, 2, 3, 4] [0, 1, 2, 9]
const copy = [...a];
copy.push(99);
console.log(a, copy);                             // [1, 2] [1, 2, 99]

// Spread works on any iterable: strings, Sets, Maps and their keys().
console.log([...'abc'], [...new Set([2, 2, 1])]); // ['a', 'b', 'c'] [2, 1]
const m = new Map([['x', 1], ['y', 2]]);
console.log([...m], [...m.keys()]);               // [['x', 1], ['y', 2]] ['x', 'y']

// Objects: later keys win, so "copy with changes" is one expression.
const state = { r: 0, c: 0, steps: 0 };
const moved = { ...state, c: 1, steps: state.steps + 1 };
console.log(moved, state.steps);                  // { r: 0, c: 1, steps: 1 } 0

// Shallow: the inner arrays are shared between the copy and the original.
const grid = [[1, 2], [3, 4]];
const outerCopy = [...grid];
outerCopy[0][0] = 'X';
console.log(grid[0]);                             // ['X', 2]

// Rest parameters collect any number of arguments into a real array.
function maxOf(first, ...rest) {
  let best = first;
  for (const x of rest) if (x > best) best = x;
  return best;
}
console.log(maxOf(3, 9, 4), maxOf(7));            // 9 7
const args = [5, 1, 8];
console.log(maxOf(...args), Math.max(...args));   // 8 8: spread an array into separate arguments
