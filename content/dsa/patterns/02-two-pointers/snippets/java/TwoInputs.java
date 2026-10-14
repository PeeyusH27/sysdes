// Template 3: one pointer per input (or both ends of one input) feeding an output.
// The largest square of a sorted array sits at one of its two ends, so fill the result from the back.
public final class TwoInputs {
    private TwoInputs() {}

    public static int[] sortedSquares(int[] nums) {
        int[] out = new int[nums.length];
        int left = 0;
        int right = nums.length - 1;
        for (int pos = nums.length - 1; pos >= 0; pos--) {
            int a = nums[left] * nums[left];
            int b = nums[right] * nums[right];
            if (a > b) {
                out[pos] = a;
                left++;
            } else {
                out[pos] = b;
                right--;
            }
        }
        return out;
    }

    // The same shape merges two sorted arrays: compare the heads, take the smaller, advance that pointer.
    public static int[] mergeSorted(int[] a, int[] b) {
        int[] out = new int[a.length + b.length];
        int k = 0;
        int i = 0;
        int j = 0;
        while (i < a.length && j < b.length) out[k++] = a[i] <= b[j] ? a[i++] : b[j++];
        while (i < a.length) out[k++] = a[i++];
        while (j < b.length) out[k++] = b[j++];
        return out;
    }
}
