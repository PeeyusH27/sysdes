import java.util.List;

final class CoinsTest {
    public static void main(String[] args) {
        Check.test("greedy is optimal for canonical coins", () -> {
            int[] us = {1, 5, 10, 25};
            Check.eq(List.of(25, 25, 10, 5, 1, 1, 1), Coins.greedyChange(us, 68));
            for (int x = 0; x <= 200; x++) Check.eq(Coins.minCoins(us, x), Coins.greedyChange(us, x).size());
        });

        Check.test("greedy fails for arbitrary coins, DP does not", () -> {
            Check.eq(List.of(4, 1, 1), Coins.greedyChange(new int[] {1, 3, 4}, 6));
            Check.eq(2, Coins.minCoins(new int[] {1, 3, 4}, 6));
            Check.isTrue(Coins.greedyChange(new int[] {4, 3}, 6) == null); // greedy gets stuck at 2 left, though 3 + 3 works
            Check.eq(2, Coins.minCoins(new int[] {4, 3}, 6));
            Check.eq(-1, Coins.minCoins(new int[] {5}, 3));
        });

        Check.finish();
    }
}
