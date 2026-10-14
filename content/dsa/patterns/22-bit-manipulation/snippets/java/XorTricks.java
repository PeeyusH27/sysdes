import java.util.Arrays;

public final class XorTricks {
    // Template 2: XOR cancellation. x ^ x = 0, x ^ 0 = x, and the order doesn't matter, so
    // XOR-ing an array leaves exactly the bits of the values that appear an odd number of times.
    public static int xorAll(int[] nums) {
        int acc = 0;
        for (int x : nums) acc ^= x;
        return acc;
    }

    // Missing number in 0..n: XOR every index and value; present numbers appear twice and cancel.
    public static int missingNumber(int[] nums) {
        int acc = nums.length;
        for (int i = 0; i < nums.length; i++) acc ^= i ^ nums[i];
        return acc;
    }

    // Two values appear once, all others twice. a ^ b is non-zero, so pick a bit where a and b differ
    // and XOR each half separately: each half then holds exactly one of the two singles.
    public static int[] twoSingles(int[] nums) {
        int both = xorAll(nums);
        int bit = both & -both;               // lowest set bit of a ^ b
        int a = 0;
        for (int x : nums) if ((x & bit) != 0) a ^= x;
        int[] pair = {a, both ^ a};
        Arrays.sort(pair);
        return pair;
    }
}
