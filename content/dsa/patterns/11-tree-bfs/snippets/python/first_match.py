from __future__ import annotations

from typing import Callable, Optional

from trees import TreeNode


# Early exit: BFS meets nodes in order of depth, so the first node that matches is a shallowest one.
# Return as soon as you see it: nothing deeper can beat it, so the rest of the tree is never touched.
def shallowest_depth(root: Optional[TreeNode], matches: Callable[[TreeNode], bool]) -> int:
    queue = [root] if root else []
    head = 0
    depth = 0
    while head < len(queue):
        depth += 1
        size = len(queue) - head
        for _ in range(size):
            node = queue[head]
            head += 1
            if matches(node):
                return depth
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    return -1  # nothing matched


def is_leaf(node: TreeNode) -> bool:
    return node.left is None and node.right is None
