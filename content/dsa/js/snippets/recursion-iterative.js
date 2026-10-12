class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } } // @hide
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } } // @hide
// ListNode and TreeNode are provided in the editor.
// A 100,000-node linked list: far deeper than the call stack allows.
let head = null;
for (let i = 0; i < 100000; i++) head = new ListNode(i, head);

const lengthRec = (node) => (node ? 1 + lengthRec(node.next) : 0);
try {
  lengthRec(head);
} catch (e) {
  console.log('recursive:', e.name);     // recursive: RangeError
}
function lengthLoop(node) {
  let n = 0;
  for (; node; node = node.next) n++;
  return n;
}
console.log('loop:', lengthLoop(head));  // loop: 100000

// Tree DFS with an explicit stack: same pre-order as the recursive version.
const tree = new TreeNode(1, new TreeNode(2, new TreeNode(4), new TreeNode(5)), new TreeNode(3));
function preorderRec(node, out = []) {
  if (!node) return out;
  out.push(node.val);
  preorderRec(node.left, out);
  preorderRec(node.right, out);
  return out;
}
function preorderStack(root) {
  const out = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop();
    out.push(node.val);
    if (node.right) stack.push(node.right); // push right first so left is popped first
    if (node.left) stack.push(node.left);
  }
  return out;
}
console.log(preorderRec(tree), preorderStack(tree)); // [1, 2, 4, 5, 3] [1, 2, 4, 5, 3]
