from __future__ import annotations

from typing import List, Optional

from trees import TreeNode


# Iterative DFS: an explicit stack replaces the call stack. Same visiting order, no recursion depth limit.
def preorder_iterative(root: Optional[TreeNode]) -> List[int]:
    out: List[int] = []
    stack = [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        if node.right:
            stack.append(node.right)  # pushed first, so it is popped AFTER the left subtree
        if node.left:
            stack.append(node.left)
    return out


# In-order: slide left as far as possible, visit, then step into the right subtree. Sorted order on a BST.
def inorder_iterative(root: Optional[TreeNode]) -> List[int]:
    out: List[int] = []
    stack: List[TreeNode] = []
    node = root
    while node is not None or stack:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        out.append(node.val)
        node = node.right
    return out


# Post-order: run pre-order with the children swapped (node, right, left), then reverse it (left, right, node).
def postorder_iterative(root: Optional[TreeNode]) -> List[int]:
    out: List[int] = []
    stack = [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)
    out.reverse()
    return out
