import java.util.ArrayList;
import java.util.List;

final class TryIt {
    public static void main(String[] args) {
        // Edit the trees (level order, null = missing child) and run. The methods are the templates above.
        TreeNode root = Trees.fromArray(8, 3, 10, 1, 6, null, 14, null, null, 4, 7);
        System.out.println(LevelLoop.levelValues(root));                         // [[8], [3, 10], [1, 6, 14], [4, 7]]
        System.out.println(LevelLoop.levelMaxes(root));                          // [8, 10, 14, 7]
        System.out.println(FirstMatch.shallowestDepth(root, FirstMatch::isLeaf)); // 3 (leaves 1 and 14 are on level 3)

        // remove(0) vs a head index on a 50,000-item queue. Double the length and watch remove(0) take about 4x as long.
        List<Integer> items = new ArrayList<>();
        for (int i = 0; i < 50000; i++) items.add(i);
        long t = System.nanoTime();
        List<Integer> a = new ArrayList<>(items);
        while (!a.isEmpty()) a.remove(0);
        System.out.println("remove(0): " + (System.nanoTime() - t) / 1_000_000 + " ms");      // it grows quadratically
        t = System.nanoTime();
        ArrayQueue<Integer> q = new ArrayQueue<>();
        for (int x : items) q.push(x);
        while (q.size() > 0) q.shift();
        System.out.println("head index: " + (System.nanoTime() - t) / 1_000_000 + " ms");  // a few ms at most
    }
}
