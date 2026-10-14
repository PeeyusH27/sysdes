from __future__ import annotations

from typing import List, NamedTuple, Optional

from trees import TreeNode


class Orders(NamedTuple):
    pre: List[int]
    inorder: List[int]
    post: List[int]


# The three depth-first orders differ only in WHEN a node does its work relative to its children.
def traversals(root: Optional[TreeNode]) -> Orders:
    pre: List[int] = []
    inorder: List[int] = []
    post: List[int] = []

    def dfs(node: Optional[TreeNode]) -> None:
        if node is None:
            return
        pre.append(node.val)       # before the children: top-down work (pass something down)
        dfs(node.left)
        inorder.append(node.val)   # between them: on a BST this visits values in sorted order
        dfs(node.right)
        post.append(node.val)      # after both: bottom-up work (combine the children's answers)

    dfs(root)
    return Orders(pre, inorder, post)
