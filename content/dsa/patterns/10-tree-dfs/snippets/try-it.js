import { fromArray } from './tree.js'; // @hide
import { traversals } from './orders.js'; // @hide
import { height } from './return-up.js'; // @hide
import { goodNodes } from './carry-down.js'; // @hide
import { longestUnivaluePath } from './global-best.js'; // @hide
import { inorderIterative } from './iterative.js'; // @hide
// Edit the trees (level order, null = missing child) and press Run. The functions are the templates above.
const root = fromArray([8, 3, 10, 1, 6, null, 14, null, null, 4, 7]);
console.log(traversals(root));                 // { pre: [8, 3, 1, 6, 4, 7, 10, 14], inorder: [1, 3, 4, 6, 7, 8, 10, 14], post: [1, 4, 7, 6, 3, 14, 10, 8] }
console.log(height(root));                     // 4
console.log(goodNodes(fromArray([5, 3, 8, 6, 2, 7, 9])));               // 4
console.log(longestUnivaluePath(fromArray([1, 4, 5, 4, 4, 5])));        // 2
console.log(inorderIterative(fromArray([6, 3, 9, 1, 4, 8, 10])));       // [1, 3, 4, 6, 8, 9, 10]
