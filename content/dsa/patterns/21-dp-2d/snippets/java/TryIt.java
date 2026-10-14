import java.util.Arrays;

// Edit the inputs and run main. The methods are the templates above.
public final class TryIt {
    static String show(int[][] table) {
        StringBuilder sb = new StringBuilder();
        for (int[] row : table) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append(Arrays.toString(row).replaceAll("[\\[\\],]", ""));
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        // The shared-row trap: Arrays.fill evaluates new int[4] ONCE, so every row is the same array.
        int[][] shared = new int[3][];
        Arrays.fill(shared, new int[4]);
        shared[0][1] = 7;
        System.out.println(show(shared));  // 0 7 0 0 | 0 7 0 0 | 0 7 0 0

        // new int[3][4] allocates a separate array per row: independent rows.
        int[][] table = new int[3][4];
        table[0][1] = 7;
        System.out.println(show(table));   // 0 7 0 0 | 0 0 0 0 | 0 0 0 0

        // Two strings, with the answer rebuilt from the table.
        System.out.println(TwoStrings.lcsString("CLOUD", "COLD"));  // CLD

        // Same items, two loop directions.
        System.out.println(Knapsack.knapsack01(new int[] {2, 3}, new int[] {3, 5}, 6) + " "
                + Knapsack.knapsackUnbounded(new int[] {2, 3}, new int[] {3, 5}, 6)); // 8 10
        System.out.println(Knapsack.knapsackItems(new int[] {3, 2, 2}, new int[] {5, 3, 3}, 4)); // Result[best=6, items=[1, 2]]
    }
}
