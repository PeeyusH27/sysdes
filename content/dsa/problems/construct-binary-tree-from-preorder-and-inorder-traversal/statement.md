Two arrays describe the same binary tree: `preorder` lists its values in preorder (node, left subtree, right subtree) and `inorder` lists them in inorder (left subtree, node, right subtree). All values in the tree are **distinct**.

Rebuild the tree and return its root. The tests show the returned tree as a level-order list with `null` for missing children.

### Constraints

- `1 <= preorder.length <= 3000`
- `inorder.length === preorder.length`
- `-3000 <= preorder[i], inorder[i] <= 3000`
- Every value is distinct, and both arrays are valid traversals of the same tree.
