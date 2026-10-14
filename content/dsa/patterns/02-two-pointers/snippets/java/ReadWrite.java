// Template 2: same direction. `read` visits every element; `write` marks the end of the part you keep.
// Everything before `write` is final, so the array is compacted in place with O(1) extra space.
public final class ReadWrite {
    private ReadWrite() {}

    public static int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int write = 1;
        for (int read = 1; read < nums.length; read++) {
            if (nums[read] != nums[write - 1]) {   // a value we haven't kept yet
                nums[write] = nums[read];
                write++;
            }
        }
        return write;                              // length of the unique prefix
    }
}
