from __future__ import annotations

from typing import List, Optional


# Helpers so the snippets run on their own (the same TreeNode class the problems give you).
class TreeNode:
    def __init__(self, val: int = 0, left: Optional[TreeNode] = None, right: Optional[TreeNode] = None):
        self.val = val
        self.left = left
        self.right = right


# Builds a tree from level order with None for missing children, e.g. [8, 3, 10, 1, 6, None, 14].
def from_array(values: List[Optional[int]]) -> Optional[TreeNode]:
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0
    for i in range(1, len(values), 2):
        parent = queue[head]
        head += 1
        if values[i] is not None:
            parent.left = TreeNode(values[i])
            queue.append(parent.left)
        if i + 1 < len(values) and values[i + 1] is not None:
            parent.right = TreeNode(values[i + 1])
            queue.append(parent.right)
    return root
