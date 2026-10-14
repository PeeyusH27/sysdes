// Template 1: exact match on a sorted array.
// Invariant: if target is anywhere in nums, it is inside nums[lo..hi] (both ends included).
public final class Classic {
    private Classic() {}

    public static int binarySearch(int[] nums, int target) {
        int lo = 0;
        int hi = nums.length - 1;
        while (lo <= hi) {                        // the range is not empty
            int mid = lo + (hi - lo) / 2;         // rounds down; (lo + hi) / 2 could overflow int on huge arrays
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1; // mid and everything left of it are too small
            else hi = mid - 1;                    // mid and everything right of it are too big
        }
        return -1;                                // empty range: target is not in nums
    }
}
