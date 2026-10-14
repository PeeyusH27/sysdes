from __future__ import annotations

from typing import List, Optional

from trees import TreeNode


# Template 2: carry state down (pre-order). Each call receives what its ancestors know (the max so far, a running
# sum, the allowed range) and hands an updated value to its children. Numbers are immutable, so nothing to undo.
def good_nodes(root: Optional[TreeNode]) -> int:
    # A node is "good" when nothing on the path from the root down to it is larger than it.
    def dfs(node: Optional[TreeNode], max_so_far: float) -> int:
        if node is None:
            return 0
        good = 1 if node.val >= max_so_far else 0
        next_max = max(max_so_far, node.val)
        return good + dfs(node.left, next_max) + dfs(node.right, next_max)

    return dfs(root, float("-inf"))


# Carrying a whole path down: push before recursing, pop after (backtracking), copy it only at a leaf.
def root_to_leaf_paths(root: Optional[TreeNode]) -> List[List[int]]:
    paths: List[List[int]] = []
    path: List[int] = []

    def dfs(node: Optional[TreeNode]) -> None:
        if node is None:
            return
        path.append(node.val)
        if node.left is None and node.right is None:
            paths.append(list(path))  # copy: path keeps changing
        dfs(node.left)
        dfs(node.right)
        path.pop()                    # undo before returning to the parent

    dfs(root)
    return paths
