from __future__ import annotations

from typing import Optional

from trees import TreeNode


# BST template: in a binary search tree every value in a left subtree is smaller than the node and every value in a
# right subtree is larger. So one comparison tells you which whole subtree can't contain what you want: skip it.
def range_sum(root: Optional[TreeNode], low: int, high: int) -> int:
    if root is None:
        return 0
    if root.val < low:
        return range_sum(root.right, low, high)  # root and its entire left subtree are too small
    if root.val > high:
        return range_sum(root.left, low, high)   # root and its entire right subtree are too large
    return root.val + range_sum(root.left, low, high) + range_sum(root.right, low, high)


# Walking down one branch needs no recursion at all: O(height).
def search_bst(root: Optional[TreeNode], target: int) -> Optional[TreeNode]:
    node = root
    while node is not None and node.val != target:
        node = node.left if target < node.val else node.right
    return node
