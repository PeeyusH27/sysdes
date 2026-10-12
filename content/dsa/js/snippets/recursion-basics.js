// Fast power: the base case stops the recursion, and every call halves n.
function power(x, n, depth = 0) {
  console.log(`${'  '.repeat(depth)}power(${x}, ${n})`); // indentation = stack depth
  if (n === 0) return 1;                                 // base case
  const half = power(x, Math.floor(n / 2), depth + 1);   // smaller subproblem
  return n % 2 === 0 ? half * half : half * half * x;    // combine on the way back
}
console.log(power(2, 10));
// power(2, 10)
//   power(2, 5)
//     power(2, 2)
//       power(2, 1)
//         power(2, 0)
// 1024: only 5 frames deep, O(log n)

// Recursion on lists and trees follows the shape of the data.
// ListNode and TreeNode are provided in the editor.
class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } } // @hide
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } } // @hide
const listLength = (node) => (node === null ? 0 : 1 + listLength(node.next));
const maxDepth = (node) => (node === null ? 0 : 1 + Math.max(maxDepth(node.left), maxDepth(node.right)));

const list = new ListNode(1, new ListNode(2, new ListNode(3)));
const tree = new TreeNode(1, new TreeNode(2, new TreeNode(4)), new TreeNode(3));
console.log(listLength(list), maxDepth(tree)); // 3 3
