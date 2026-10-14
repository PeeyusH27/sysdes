import java.util.*;

final class Change {
    private static final int NONE = Integer.MAX_VALUE / 2;  // "no way to pay this", safe to add to

    // Greedy: take the largest coin that fits, repeat. With unlimited coins of a canonical system like
    // 100/25/10/5 this is optimal. With LIMITED tubes it never backtracks, so it can fail even when
    // change exists: owe 30¢ from one 25¢ and three 10¢, it takes the 25¢ and then needs a 5¢.
    static Optional<List<Integer>> greedy(int amount, Map<Integer, Integer> counts) {
        List<Integer> coins = new ArrayList<>();
        for (int d : Coins.ACCEPTED) {
            int n = Math.min(counts.getOrDefault(d, 0), amount / d);
            amount -= n * d;
            for (int k = 0; k < n; k++) coins.add(d);
        }
        return amount == 0 ? Optional.of(coins) : Optional.empty();
    }

    // Bounded DP: the fewest coins that pay `amount` exactly, using at most counts[d] of each coin.
    // Work is denominations × amount × coins per tube: microseconds for a vending machine.
    static Optional<List<Integer>> make(int amount, Map<Integer, Integer> counts) {
        List<Integer> denoms = Coins.ACCEPTED;
        int[] best = new int[amount + 1];  // best[a]: fewest coins for a, denominations so far
        Arrays.fill(best, NONE);
        best[0] = 0;
        int[][] used = new int[denoms.size()][];  // used[i][a]: how many denoms[i] that best way uses
        for (int i = 0; i < denoms.size(); i++) {
            int d = denoms.get(i);
            int have = counts.getOrDefault(d, 0);
            int[] next = new int[amount + 1];
            int[] pick = new int[amount + 1];
            Arrays.fill(next, NONE);
            for (int a = 0; a <= amount; a++) {
                for (int j = 0; j <= have && j * d <= a; j++) {
                    if (best[a - j * d] + j < next[a]) {
                        next[a] = best[a - j * d] + j;
                        pick[a] = j;
                    }
                }
            }
            used[i] = pick;
            best = next;
        }
        if (best[amount] >= NONE) return Optional.empty();  // impossible: refuse the sale and refund
        List<Integer> coins = new ArrayList<>();
        for (int i = denoms.size() - 1, a = amount; i >= 0; i--) {  // walk back through the choices
            int j = used[i][a];
            for (int k = 0; k < j; k++) coins.add(denoms.get(i));
            a -= j * denoms.get(i);
        }
        coins.sort(Comparator.reverseOrder());
        return Optional.of(coins);
    }

    private Change() {}
}
