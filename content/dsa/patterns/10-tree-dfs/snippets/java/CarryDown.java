import java.util.ArrayList;
import java.util.List;

final class CarryDown {
    // Template 2: carry state down (pre-order). Each call receives what its ancestors know (the max so far, a running
    // sum, the allowed range) and hands an updated value to its children. An int is passed by value, so nothing to undo.
    static int goodNodes(TreeNode root) {
        return dfs(root, Integer.MIN_VALUE); // nothing is smaller than "no ancestor yet", so the root always counts
    }

    // A node is "good" when nothing on the path from the root down to it is larger than it.
    private static int dfs(TreeNode node, int maxSoFar) {
        if (node == null) return 0;
        int good = node.val >= maxSoFar ? 1 : 0;
        int nextMax = Math.max(maxSoFar, node.val);
        return good + dfs(node.left, nextMax) + dfs(node.right, nextMax);
    }

    // Carrying a whole path down: push before recursing, pop after (backtracking), copy it only at a leaf.
    static List<List<Integer>> rootToLeafPaths(TreeNode root) {
        List<List<Integer>> paths = new ArrayList<>();
        walk(root, new ArrayList<>(), paths);
        return paths;
    }

    private static void walk(TreeNode node, List<Integer> path, List<List<Integer>> paths) {
        if (node == null) return;
        path.add(node.val);
        if (node.left == null && node.right == null) paths.add(new ArrayList<>(path)); // copy: path keeps changing
        walk(node.left, path, paths);
        walk(node.right, path, paths);
        path.remove(path.size() - 1);                                                 // undo before returning to the parent
    }
}
