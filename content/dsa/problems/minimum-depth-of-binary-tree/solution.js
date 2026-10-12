function minDepth(root) {
  if (root === null) return 0;
  const queue = [root];
  let head = 0;
  let depth = 0;
  while (head < queue.length) {
    depth++;
    const size = queue.length - head;
    for (let i = 0; i < size; i++) {
      const node = queue[head++];
      if (node.left === null && node.right === null) return depth; // first leaf = shallowest leaf
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return depth; // not reached: a non-empty tree always has a leaf
}
