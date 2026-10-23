function isSubtree(root, subRoot) {
  if (root === null) return false; // an empty tree contains no non-empty subtree
  return same(root, subRoot) || isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}

function same(a, b) {
  if (a === null || b === null) return a === b;
  return a.val === b.val && same(a.left, b.left) && same(a.right, b.right);
}
