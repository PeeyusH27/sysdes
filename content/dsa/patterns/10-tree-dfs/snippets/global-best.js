// Template 3: return one thing up, record another in a variable outside the recursion.
// Longest path whose nodes all share one value, counted in edges. A path may bend at a node (left arm + right arm),
// but a parent can extend only ONE arm, so the helper returns the longer arm and the bent path goes into `best`.
export function longestUnivaluePath(root) {
  let best = 0;
  const arm = (node) => {
    if (node === null) return 0;
    const left = arm(node.left);
    const right = arm(node.right);
    const leftArm = node.left !== null && node.left.val === node.val ? left + 1 : 0;
    const rightArm = node.right !== null && node.right.val === node.val ? right + 1 : 0;
    best = Math.max(best, leftArm + rightArm); // the best path that bends exactly here
    return Math.max(leftArm, rightArm);        // what the parent is allowed to extend
  };
  arm(root);
  return best;
}
