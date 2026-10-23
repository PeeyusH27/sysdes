function isSameTree(p, q) {
  if (p === null || q === null) return p === q; // both empty is a match; exactly one empty is not
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
