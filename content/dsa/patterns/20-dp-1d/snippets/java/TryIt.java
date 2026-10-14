import java.util.HashMap;
import java.util.Map;

// The same problem four ways. Edit cost and run main: all four must agree.
public final class TryIt {
    static int plainCalls = 0;
    static int memoCalls = 0;
    static final Map<Integer, Integer> MEMO = new HashMap<>();
    static int[] longCost = new int[25];

    static int plain(int i) {
        plainCalls++;
        return i <= 1 ? 0 : Math.min(plain(i - 1) + longCost[i - 1], plain(i - 2) + longCost[i - 2]);
    }

    static int cached(int i) {
        memoCalls++;
        if (i <= 1) return 0;
        if (!MEMO.containsKey(i)) MEMO.put(i, Math.min(cached(i - 1) + longCost[i - 1], cached(i - 2) + longCost[i - 2]));
        return MEMO.get(i);
    }

    public static void main(String[] args) {
        int[] cost = {1, 4, 2, 3, 1, 5, 2};
        System.out.println(StairsRecursive.minCostRecursive(cost) + " " + StairsMemo.minCostMemo(cost) + " "
                + StairsTable.minCostTable(cost) + " " + StairsRolling.minCostRolling(cost)); // 6 6 6 6

        // Why the memo matters: count the calls each version makes on a 25-step staircase.
        for (int i = 0; i < 25; i++) longCost[i] = (i * 7) % 10;
        System.out.println(plain(25) + " " + plainCalls + " calls");   // 41 242785 calls
        System.out.println(cached(25) + " " + memoCalls + " calls");   // 41 49 calls

        // DP over an amount: the fewest perfect squares that add up to n.
        System.out.println(OverAmount.numSquares(12) + " " + OverAmount.numSquares(13)); // 3 2
    }
}
