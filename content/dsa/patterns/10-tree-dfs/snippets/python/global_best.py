from __future__ import annotations

from typing import Optional

from trees import TreeNode


# Template 3: return one thing up, record another in a variable outside the recursion.
# Longest path whose nodes all share one value, counted in edges. A path may bend at a node (left arm + right arm),
# but a parent can extend only ONE arm, so the helper returns the longer arm and the bent path goes into `best`.
def longest_univalue_path(root: Optional[TreeNode]) -> int:
    best = 0

    def arm(node: Optional[TreeNode]) -> int:
        nonlocal best
        if node is None:
            return 0
        left = arm(node.left)
        right = arm(node.right)
        left_arm = left + 1 if node.left is not None and node.left.val == node.val else 0
        right_arm = right + 1 if node.right is not None and node.right.val == node.val else 0
        best = max(best, left_arm + right_arm)  # the best path that bends exactly here
        return max(left_arm, right_arm)         # what the parent is allowed to extend

    arm(root)
    return best
