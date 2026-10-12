function hasPathSum(root, targetSum) {
  if (root === null) return false;
  const remaining = targetSum - root.val;
  if (root.left === null && root.right === null) return remaining === 0; // a leaf ends the path
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}
