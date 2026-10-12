function invertTree(root) {
  if (root === null) return null;
  // Invert both subtrees, then hang each one on the opposite side.
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}
