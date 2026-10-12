function maxPathSum(root) {
  let best = -Infinity;
  // Best sum of a path that starts at node and goes straight down: the part a parent can extend.
  const gain = (node) => {
    if (node === null) return 0;
    const left = Math.max(0, gain(node.left));   // a negative arm is better left out
    const right = Math.max(0, gain(node.right));
    best = Math.max(best, node.val + left + right); // the best path that bends at node
    return node.val + Math.max(left, right);
  };
  gain(root);
  return best;
}
