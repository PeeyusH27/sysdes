import java.util.ArrayList;
import java.util.List;

final class LevelLoop {
    // Template: BFS with a level-size loop. At the start of each level, the queue holds exactly that level's nodes,
    // so snapshot its size and process that many; everything they enqueue belongs to the next level.
    static List<Integer> levelMaxes(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        List<TreeNode> queue = new ArrayList<>();
        if (root != null) queue.add(root);
        int head = 0;                                // queue.get(head) is the front: no remove(0), so dequeue is O(1)
        while (head < queue.size()) {
            int size = queue.size() - head;          // nodes waiting right now = one full level
            int max = Integer.MIN_VALUE;
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.get(head++);
                max = Math.max(max, node.val);       // per-level work goes here: sum, count, first, last...
                if (node.left != null) queue.add(node.left);   // children line up behind the rest of this level
                if (node.right != null) queue.add(node.right);
            }
            result.add(max);
        }
        return result;
    }

    // The same loop with two lists: build the next level while walking the current one, then swap.
    static List<List<Integer>> levelValues(TreeNode root) {
        List<List<Integer>> levels = new ArrayList<>();
        List<TreeNode> level = new ArrayList<>();
        if (root != null) level.add(root);
        while (!level.isEmpty()) {
            List<Integer> values = new ArrayList<>();
            List<TreeNode> next = new ArrayList<>();
            for (TreeNode node : level) {
                values.add(node.val);
                if (node.left != null) next.add(node.left);
                if (node.right != null) next.add(node.right);
            }
            levels.add(values);
            level = next;
        }
        return levels;
    }
}
