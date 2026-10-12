function maxDepth(root) {
  if (root === null) return 0; // an empty subtree adds no levels
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
