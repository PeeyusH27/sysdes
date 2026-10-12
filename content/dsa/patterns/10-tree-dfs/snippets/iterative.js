// Iterative DFS: an explicit stack replaces the call stack. Same visiting order, no recursion depth limit.
export function preorderIterative(root) {
  const out = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop();
    out.push(node.val);
    if (node.right) stack.push(node.right); // pushed first, so it is popped AFTER the left subtree
    if (node.left) stack.push(node.left);
  }
  return out;
}

// In-order: slide left as far as possible, visit, then step into the right subtree. Sorted order on a BST.
export function inorderIterative(root) {
  const out = [];
  const stack = [];
  let node = root;
  while (node !== null || stack.length) {
    while (node !== null) {
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    out.push(node.val);
    node = node.right;
  }
  return out;
}

// Post-order: run pre-order with the children swapped (node, right, left), then reverse it (left, right, node).
export function postorderIterative(root) {
  const out = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop();
    out.push(node.val);
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  return out.reverse();
}
