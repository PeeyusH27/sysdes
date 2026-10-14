import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

final class FirstMatch {
    // Early exit: BFS meets nodes in order of depth, so the first node that matches is a shallowest one.
    // Return as soon as you see it: nothing deeper can beat it, so the rest of the tree is never touched.
    static int shallowestDepth(TreeNode root, Predicate<TreeNode> matches) {
        List<TreeNode> queue = new ArrayList<>();
        if (root != null) queue.add(root);
        int head = 0;
        int depth = 0;
        while (head < queue.size()) {
            depth++;
            int size = queue.size() - head;
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.get(head++);
                if (matches.test(node)) return depth;
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
        }
        return -1; // nothing matched
    }

    static boolean isLeaf(TreeNode node) {
        return node.left == null && node.right == null;
    }
}
