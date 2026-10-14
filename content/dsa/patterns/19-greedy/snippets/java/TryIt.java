// Edit the inputs and run main. The methods are the templates above.
public final class TryIt {
    public static void main(String[] args) {
        System.out.println(SortThenGreedy.findContentChildren(new int[] {3, 1, 6, 2, 4}, new int[] {2, 1, 5, 3, 1})); // 4
        System.out.println(IntervalScheduling.maxNonOverlapping(new int[][] {{5, 9}, {1, 3}, {6, 8}, {2, 5}, {8, 10}, {4, 6}})); // 4

        System.out.println(Coins.greedyChange(new int[] {25, 10, 5, 1}, 68) + " " + Coins.minCoins(new int[] {25, 10, 5, 1}, 68)); // [25, 25, 10, 5, 1, 1, 1] 7
        System.out.println(Coins.greedyChange(new int[] {4, 3, 1}, 6) + " " + Coins.minCoins(new int[] {4, 3, 1}, 6));             // [4, 1, 1] 2  (greedy is wrong here)
    }
}
