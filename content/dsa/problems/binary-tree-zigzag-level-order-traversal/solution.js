function zigzagLevelOrder(root) {
  const levels = [];
  const queue = root ? [root] : [];
  let head = 0;
  let leftToRight = true;
  while (head < queue.length) {
    const size = queue.length - head;
    const level = new Array(size);
    for (let i = 0; i < size; i++) {
      const node = queue[head++];
      // Nodes always come out left to right; only the slot we write into changes.
      level[leftToRight ? i : size - 1 - i] = node.val;
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    levels.push(level);
    leftToRight = !leftToRight;
  }
  return levels;
}
