function levelOrder(root) {
  const levels = [];
  const queue = root ? [root] : [];
  let head = 0;
  while (head < queue.length) {
    const size = queue.length - head; // the nodes waiting now are exactly one level
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue[head++];
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    levels.push(level);
  }
  return levels;
}
