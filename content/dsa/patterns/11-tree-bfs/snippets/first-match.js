// Early exit: BFS meets nodes in order of depth, so the first node that matches is a shallowest one.
// Return as soon as you see it: nothing deeper can beat it, so the rest of the tree is never touched.
export function shallowestDepth(root, matches) {
  const queue = root ? [root] : [];
  let head = 0;
  let depth = 0;
  while (head < queue.length) {
    depth++;
    const size = queue.length - head;
    for (let i = 0; i < size; i++) {
      const node = queue[head++];
      if (matches(node)) return depth;
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return -1;                                   // nothing matched
}

export const isLeaf = (node) => node.left === null && node.right === null;
