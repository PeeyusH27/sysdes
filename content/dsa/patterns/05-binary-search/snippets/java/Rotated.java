// Template 3: a sorted array of distinct values, rotated. Returns the index of the minimum (where the rotation starts).
// Compare with nums[hi]: if nums[mid] > nums[hi], the drop, and so the minimum, is to the right of mid.
public final class Rotated {
    private Rotated() {}

    public static int findMinIndex(int[] nums) {
        int lo = 0;
        int hi = nums.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) lo = mid + 1; // mid is in the upper run: the minimum comes after it
            else hi = mid;                          // mid is in the lower run: the minimum is mid or before it
        }
        return lo;
    }
}
