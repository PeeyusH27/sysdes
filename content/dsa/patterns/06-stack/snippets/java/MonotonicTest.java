final class MonotonicTest {
    static int[] bruteNextGreater(int[] nums) {
        int[] out = new int[nums.length];
        for (int i = 0; i < nums.length; i++) {
            out[i] = -1;
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[j] > nums[i]) {
                    out[i] = j;
                    break;
                }
            }
        }
        return out;
    }

    public static void main(String[] args) {
        Check.test("next greater index", () -> {
            Check.eq(Monotonic.nextGreaterIndex(new int[] {5, 2, 3, 1, 6, 4}), new int[] {4, 2, 4, 4, -1, -1});
            Check.eq(Monotonic.nextGreaterIndex(new int[] {3, 3, 1, 4}), new int[] {3, 3, 3, -1});
            Check.eq(Monotonic.nextGreaterIndex(new int[] {9, 7, 4}), new int[] {-1, -1, -1});
            Check.eq(Monotonic.nextGreaterIndex(new int[] {}), new int[] {});
        });
        Check.test("next greater index matches brute force on random input", () -> {
            long seed = 7;
            for (int t = 0; t < 50; t++) {
                int[] nums = new int[12];
                for (int i = 0; i < nums.length; i++) {
                    seed = (seed * 1103515245L + 12345L) % 2147483648L;
                    nums[i] = (int) (seed % 10);
                }
                Check.eq(Monotonic.nextGreaterIndex(nums), bruteNextGreater(nums));
            }
        });
        Check.test("nearest smaller neighbours on both sides", () -> {
            Monotonic.Neighbours a = Monotonic.smallerNeighbours(new int[] {4, 6, 5, 2, 7, 3});
            Check.eq(a.left(), new int[] {-1, 0, 0, -1, 3, 3});
            Check.eq(a.right(), new int[] {3, 2, 3, 6, 5, 6});
            // Ties: right is strictly smaller, left is smaller or equal.
            Monotonic.Neighbours b = Monotonic.smallerNeighbours(new int[] {3, 1, 3, 3, 0});
            Check.eq(b.left(), new int[] {-1, -1, 1, 2, -1});
            Check.eq(b.right(), new int[] {1, 4, 4, 4, 5});
        });
        Check.done();
    }
}
