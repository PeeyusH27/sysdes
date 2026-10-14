# TreeNode in, TreeNode out (recursive).
from typing import Optional


def invert_tree(root: Optional[TreeNode]) -> Optional[TreeNode]:
    if root:
        root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
