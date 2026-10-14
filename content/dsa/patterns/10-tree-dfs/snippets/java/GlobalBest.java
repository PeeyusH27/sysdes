final class GlobalBest {
    // Template 3: return one thing up, record another in a variable outside the recursion.
    // Longest path whose nodes all share one value, counted in edges. A path may bend at a node (left arm + right arm),
    // but a parent can extend only ONE arm, so the helper returns the longer arm and the bent path goes into `best`.
    static int longestUnivaluePath(TreeNode root) {
        int[] best = {0}; // a one-slot array: a local that the recursive helper is allowed to update
        arm(root, best);
        return best[0];
    }

    private static int arm(TreeNode node, int[] best) {
        if (node == null) return 0;
        int left = arm(node.left, best);
        int right = arm(node.right, best);
        int leftArm = node.left != null && node.left.val == node.val ? left + 1 : 0;
        int rightArm = node.right != null && node.right.val == node.val ? right + 1 : 0;
        best[0] = Math.max(best[0], leftArm + rightArm); // the best path that bends exactly here
        return Math.max(leftArm, rightArm);              // what the parent is allowed to extend
    }
}
