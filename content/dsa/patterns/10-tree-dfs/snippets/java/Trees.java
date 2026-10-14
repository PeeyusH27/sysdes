import java.util.ArrayList;
import java.util.List;

// Helpers so the snippets run on their own (the same TreeNode class the problems give you).
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode() {}

    TreeNode(int val) { this.val = val; }

    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

final class Trees {
    // Builds a tree from level order with null for missing children, e.g. fromArray(8, 3, 10, 1, 6, null, 14).
    static TreeNode fromArray(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        List<TreeNode> queue = new ArrayList<>();
        queue.add(root);
        int head = 0;
        for (int i = 1; i < values.length; i += 2) {
            TreeNode parent = queue.get(head++);
            if (values[i] != null) {
                parent.left = new TreeNode(values[i]);
                queue.add(parent.left);
            }
            if (i + 1 < values.length && values[i + 1] != null) {
                parent.right = new TreeNode(values[i + 1]);
                queue.add(parent.right);
            }
        }
        return root;
    }
}
