# TreeNode in, floats out (compare: float).
from collections import deque
from typing import List, Optional


def average_of_levels(root: Optional[TreeNode]) -> List[float]:
    out = []
    queue = deque([root] if root else [])
    while queue:
        total, n = 0, len(queue)
        for _ in range(n):
            node = queue.popleft()
            total += node.val
            queue.extend(child for child in (node.left, node.right) if child)
        out.append(total / n)
    return out
