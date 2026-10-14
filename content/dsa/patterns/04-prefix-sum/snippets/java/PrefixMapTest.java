final class PrefixMapTest {
    public static void main(String[] args) {
        Check.test("longest subarray with sum k, negatives allowed", () -> {
            Check.eq(PrefixMap.longestSubarrayWithSum(new int[] {2, -1, 3, -2, 1, 4}, 3), 5); // [2, -1, 3, -2, 1]
            Check.eq(PrefixMap.longestSubarrayWithSum(new int[] {0, 3, 0, 0}, 3), 4);
            Check.eq(PrefixMap.longestSubarrayWithSum(new int[] {-1, -1, 1, 1}, 0), 4);
        });
        Check.test("returns 0 when no subarray sums to k", () -> {
            Check.eq(PrefixMap.longestSubarrayWithSum(new int[] {1, 2, 4}, 5), 0);
            Check.eq(PrefixMap.longestSubarrayWithSum(new int[] {}, 0), 0);
        });
        Check.done();
    }
}
