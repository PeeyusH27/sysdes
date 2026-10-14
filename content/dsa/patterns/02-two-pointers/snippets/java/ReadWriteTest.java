import java.util.Arrays;

final class ReadWriteTest {
    public static void main(String[] args) {
        Check.test("compacts a sorted array in place", () -> {
            int[] nums = {1, 1, 2, 3, 3, 3, 4};
            int k = ReadWrite.removeDuplicates(nums);
            Check.eq(k, 4);
            Check.eq(Arrays.copyOf(nums, k), new int[] {1, 2, 3, 4});
        });
        Check.test("handles empty and all-equal input", () -> {
            Check.eq(ReadWrite.removeDuplicates(new int[] {}), 0);
            int[] same = {7, 7, 7};
            Check.eq(ReadWrite.removeDuplicates(same), 1);
            Check.eq(same[0], 7);
        });
        Check.done();
    }
}
