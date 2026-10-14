import java.util.List;

final class KnapsackTest {
    public static void main(String[] args) {
        Check.test("0/1 uses each item at most once", () -> {
            Check.eq(8, Knapsack.knapsack01(new int[] {2, 3}, new int[] {3, 5}, 6));
            Check.eq(7, Knapsack.knapsack01(new int[] {2, 3, 4}, new int[] {3, 4, 6}, 5));
            Check.eq(6, Knapsack.knapsack01(new int[] {3, 2, 2}, new int[] {5, 3, 3}, 4)); // best value per weight first would give 5
            Check.eq(0, Knapsack.knapsack01(new int[] {5}, new int[] {10}, 4));
            Check.eq(0, Knapsack.knapsack01(new int[0], new int[0], 10));
        });

        Check.test("unbounded may reuse items", () -> {
            Check.eq(10, Knapsack.knapsackUnbounded(new int[] {2, 3}, new int[] {3, 5}, 6));
            Check.eq(130, Knapsack.knapsackUnbounded(new int[] {1, 3, 4}, new int[] {15, 50, 60}, 8)); // 3 + 3 + 1 + 1: 50 + 50 + 15 + 15
            Check.eq(0, Knapsack.knapsackUnbounded(new int[] {5}, new int[] {10}, 4));
        });

        Check.test("the full table also tells you which items were taken", () -> {
            Check.eq(new Knapsack.Result(7, List.of(0, 1)), Knapsack.knapsackItems(new int[] {2, 3, 4}, new int[] {3, 4, 6}, 5));
            Check.eq(new Knapsack.Result(6, List.of(1, 2)), Knapsack.knapsackItems(new int[] {3, 2, 2}, new int[] {5, 3, 3}, 4));
            Check.eq(new Knapsack.Result(0, List.of()), Knapsack.knapsackItems(new int[] {5}, new int[] {10}, 4));
        });

        Check.finish();
    }
}
