import java.util.ArrayList;
import java.util.List;

final class Orders {
    record Result(List<Integer> pre, List<Integer> inorder, List<Integer> post) {}

    // The three depth-first orders differ only in WHEN a node does its work relative to its children.
    static Result traversals(TreeNode root) {
        Result result = new Result(new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
        dfs(root, result);
        return result;
    }

    private static void dfs(TreeNode node, Result out) {
        if (node == null) return;
        out.pre().add(node.val);      // before the children: top-down work (pass something down)
        dfs(node.left, out);
        out.inorder().add(node.val);  // between them: on a BST this visits values in sorted order
        dfs(node.right, out);
        out.post().add(node.val);     // after both: bottom-up work (combine the children's answers)
    }
}
