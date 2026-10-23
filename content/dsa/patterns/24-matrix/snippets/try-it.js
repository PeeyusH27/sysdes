import { rotateClockwise, transpose } from './rotate.js'; // @hide
import { spiralFill, spiralOrder } from './spiral.js'; // @hide
import { setZeroes } from './markers.js'; // @hide
import { gameOfLife } from './life.js'; // @hide
import { searchFlat, searchStaircase } from './sorted-matrix.js'; // @hide
import { diagonalOrder } from './diagonals.js'; // @hide
// Edit the grids and press Run. These are the templates above.
const grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
console.log(transpose([[1, 2, 3], [4, 5, 6]])); // [ [ 1, 4 ], [ 2, 5 ], [ 3, 6 ] ]
const r = grid.map((row) => [...row]);
rotateClockwise(r);
console.log(r); // [ [ 7, 4, 1 ], [ 8, 5, 2 ], [ 9, 6, 3 ] ]
console.log(spiralOrder(grid).join(' ')); // 1 2 3 6 9 8 7 4 5
console.log(spiralFill(3)); // [ [ 1, 2, 3 ], [ 8, 9, 4 ], [ 7, 6, 5 ] ]
console.log(diagonalOrder(grid).join(' ')); // 1 2 4 7 5 3 6 8 9

const z = [[1, 1, 1], [1, 0, 1], [1, 1, 1]];
setZeroes(z);
console.log(z); // [ [ 1, 0, 1 ], [ 0, 0, 0 ], [ 1, 0, 1 ] ]

const life = [[0, 1, 0], [0, 1, 0], [0, 1, 0]];
gameOfLife(life);
console.log(life); // [ [ 0, 0, 0 ], [ 1, 1, 1 ], [ 0, 0, 0 ] ]

console.log(searchFlat([[1, 3, 5, 7], [10, 11, 16, 20]], 11), searchStaircase([[1, 4, 7], [2, 5, 8], [3, 6, 9]], 6)); // true true
