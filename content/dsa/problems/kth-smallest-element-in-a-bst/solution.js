function kthSmallest(root, k) {
  const stack = [];
  let node = root;
  while (node !== null || stack.length > 0) {
    while (node !== null) { // go as far left as possible
      stack.push(node);
      node = node.left;
    }
    node = stack.pop(); // the next value in sorted order
    if (--k === 0) return node.val;
    node = node.right;
  }
  return -1; // unreachable when 1 <= k <= n
}
