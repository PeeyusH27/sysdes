// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out ClassicTest
final class ClassicTest {
    public static void main(String[] args) {
        Check.test("finds every element of a sorted array", () -> {
            int[] nums = {3, 8, 12, 17, 21, 30, 44, 52};
            for (int i = 0; i < nums.length; i++) Check.eq(Classic.binarySearch(nums, nums[i]), i);
        });
        Check.test("returns -1 for missing values, empty and one-element arrays", () -> {
            Check.eq(Classic.binarySearch(new int[] {3, 8, 12, 17, 21, 30, 44, 52}, 10), -1);
            Check.eq(Classic.binarySearch(new int[] {3, 8, 12}, 1), -1);
            Check.eq(Classic.binarySearch(new int[] {3, 8, 12}, 99), -1);
            Check.eq(Classic.binarySearch(new int[] {}, 5), -1);
            Check.eq(Classic.binarySearch(new int[] {5}, 5), 0);
            Check.eq(Classic.binarySearch(new int[] {5}, 4), -1);
        });
        Check.done();
    }
}
