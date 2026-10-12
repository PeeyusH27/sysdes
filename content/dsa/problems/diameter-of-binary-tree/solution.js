function diameterOfBinaryTree(root) {
  let best = 0;
  // Returns the height of the subtree (nodes on its longest downward path),
  // and records the longest path that bends at each node on the way.
  const height = (node) => {
    if (node === null) return 0;
    const left = height(node.left);
    const right = height(node.right);
    best = Math.max(best, left + right); // edges on the longest path bending at node
    return 1 + Math.max(left, right);    // the parent can extend only one side
  };
  height(root);
  return best;
}
