from __future__ import annotations

from typing import List, Optional

from trees import TreeNode


# Template: BFS with a level-size loop. At the start of each level, the queue holds exactly that level's nodes,
# so snapshot its size and process that many; everything they enqueue belongs to the next level.
def level_maxes(root: Optional[TreeNode]) -> List[int]:
    result: List[int] = []
    queue = [root] if root else []
    head = 0                                    # queue[head] is the front: no pop(0), so dequeue is O(1)
    while head < len(queue):
        size = len(queue) - head                # nodes waiting right now = one full level
        best = float("-inf")
        for _ in range(size):
            node = queue[head]
            head += 1
            best = max(best, node.val)          # per-level work goes here: sum, count, first, last...
            if node.left:
                queue.append(node.left)         # children line up behind the rest of this level
            if node.right:
                queue.append(node.right)
        result.append(best)
    return result


# The same loop with two lists: build the next level while walking the current one, then swap.
def level_values(root: Optional[TreeNode]) -> List[List[int]]:
    levels: List[List[int]] = []
    level = [root] if root else []
    while level:
        levels.append([node.val for node in level])
        nxt = []
        for node in level:
            if node.left:
                nxt.append(node.left)
            if node.right:
                nxt.append(node.right)
        level = nxt
    return levels
