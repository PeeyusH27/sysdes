import java.util.function.IntPredicate;

// Template 2: first true. ok(i) must be false for a prefix of [lo, hi) and true for the rest.
// Returns the first i with ok(i), or hi if there is none. Invariant: the answer is always in [lo, hi].
public final class LowerBound {
    private LowerBound() {}

    public static int firstTrue(int lo, int hi, IntPredicate ok) {
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;   // lo <= mid < hi, so both updates shrink the range
            if (ok.test(mid)) hi = mid;     // mid might be the first true: keep it
            else lo = mid + 1;              // mid is false, and so is everything before it
        }
        return lo;                          // lo == hi
    }

    // First index with nums[i] >= target, or nums.length: the first copy of target, or where it would be inserted.
    public static int lowerBound(int[] nums, int target) {
        return firstTrue(0, nums.length, i -> nums[i] >= target);
    }

    // First index with nums[i] > target: one past the last copy of target.
    public static int upperBound(int[] nums, int target) {
        return firstTrue(0, nums.length, i -> nums[i] > target);
    }

    // How many values lie in [low, high]? Two bounds, O(log n), no scanning.
    public static int countInRange(int[] nums, int low, int high) {
        return Math.max(0, upperBound(nums, high) - lowerBound(nums, low));
    }
}
