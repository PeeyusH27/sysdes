from __future__ import annotations

from typing import Optional

from trees import TreeNode


# Template 1: return a value up (post-order). Ask both subtrees for their answer, then combine at the node.
# Use it for height, size, sums, "is it balanced?": anything a node can compute from its children's answers.
def height(root: Optional[TreeNode]) -> int:
    if root is None:
        return 0                       # an empty subtree has height 0, so a leaf gets 1
    left = height(root.left)
    right = height(root.right)
    return 1 + max(left, right)        # combine on the way back up


# Same shape, different combine. -1 means "unbalanced somewhere below", so one number carries both answers
# and the whole check stays O(n) instead of recomputing heights at every node.
def is_balanced(root: Optional[TreeNode]) -> bool:
    def check(node: Optional[TreeNode]) -> int:
        if node is None:
            return 0
        left = check(node.left)
        if left == -1:
            return -1
        right = check(node.right)
        if right == -1 or abs(left - right) > 1:
            return -1
        return 1 + max(left, right)

    return check(root) != -1
