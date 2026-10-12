import { isBalanced, simplifyPath } from './matching.js'; // @hide
import { nextGreaterIndex, smallerNeighbours } from './monotonic.js'; // @hide
// Edit the inputs and press Run. These are the templates above.
console.log(isBalanced('{[()()]}'), isBalanced('([)]'));   // true false
console.log(simplifyPath('/home//user/./docs/../pics/'));   // /home/user/pics

const temps = [5, 2, 3, 1, 6, 4];
const next = nextGreaterIndex(temps);
console.log(next);                                         // [4, 2, 4, 4, -1, -1]
console.log(next.map((j, i) => (j === -1 ? 0 : j - i)));   // days to wait: [4, 1, 2, 1, 0, 0]

const { left, right } = smallerNeighbours([4, 6, 5, 2, 7, 3]);
console.log(left, right);                                  // [-1, 0, 0, -1, 3, 3] [3, 2, 3, 6, 5, 6]
