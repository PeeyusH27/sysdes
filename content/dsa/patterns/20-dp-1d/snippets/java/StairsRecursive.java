public final class StairsRecursive {
    // Form 1: plain recursion, straight from the recurrence. Correct, but best(i - 1) and best(i - 2) both
    // re-solve the same smaller steps, so the call tree roughly doubles per step: O(2^n). Fine for n = 20, hopeless for 50.
    public static int minCostRecursive(int[] cost) {
        return best(cost.length, cost);          // the top is one past the last step
    }

    private static int best(int i, int[] cost) {
        if (i <= 1) return 0;                    // you may start on step 0 or 1 for free
        return Math.min(best(i - 1, cost) + cost[i - 1], best(i - 2, cost) + cost[i - 2]);
    }
}
