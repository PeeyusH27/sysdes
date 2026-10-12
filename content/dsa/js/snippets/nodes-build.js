class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } } // @hide
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } } // @hide
// ListNode and TreeNode are provided in the editor.

// Array -> list: append behind a dummy node so the first item needs no special case.
function listFromArray(values) {
  const dummy = new ListNode();
  let tail = dummy;
  for (const v of values) tail = tail.next = new ListNode(v);
  return dummy.next;
}
// List -> array, for printing and comparing.
function listToArray(head) {
  const out = [];
  for (let node = head; node; node = node.next) out.push(node.val);
  return out;
}
const head = listFromArray([1, 2, 3]);
console.log(head.val, head.next.val, listToArray(head)); // 1 2 [1, 2, 3]

// Level order with nulls -> tree. Only real nodes get children in the array.
function treeFromLevels(values) {
  if (!values.length || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0;
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (values[i] !== null && values[i] !== undefined) queue.push((node.left = new TreeNode(values[i])));
    i++;
    if (values[i] !== null && values[i] !== undefined) queue.push((node.right = new TreeNode(values[i])));
    i++;
  }
  return root;
}
// Tree -> level order with nulls, trailing nulls trimmed.
function treeToLevels(root) {
  const out = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    out.push(node ? node.val : null);
    if (node) queue.push(node.left, node.right);
  }
  while (out.length && out.at(-1) === null) out.pop();
  return out;
}
//        1
//       / \
//      2   3
//       \   \
//        4   5
//       /
//      6
const root = treeFromLevels([1, 2, 3, null, 4, null, 5, 6]);
console.log(root.left.right.val, root.left.right.left.val); // 4 6
console.log(treeToLevels(root));         // [1, 2, 3, null, 4, null, 5, 6]
