final class LowerBoundTest {
    static final int[] NUMS = {1, 3, 3, 3, 5, 8, 9};

    public static void main(String[] args) {
        Check.test("lower and upper bound bracket every copy of a value", () -> {
            Check.eq(LowerBound.lowerBound(NUMS, 3), 1);
            Check.eq(LowerBound.upperBound(NUMS, 3), 4);
            Check.eq(LowerBound.lowerBound(NUMS, 4), 4);   // missing: insert position
            Check.eq(LowerBound.upperBound(NUMS, 4), 4);
            Check.eq(LowerBound.lowerBound(NUMS, 0), 0);
            Check.eq(LowerBound.lowerBound(NUMS, 10), NUMS.length);
            Check.eq(LowerBound.lowerBound(new int[] {}, 1), 0);
        });
        Check.test("firstTrue works on any monotonic predicate, including over values", () -> {
            Check.eq(LowerBound.firstTrue(0, 100, x -> x * x >= 50), 8);
            Check.eq(LowerBound.firstTrue(0, 5, x -> false), 5);
            Check.eq(LowerBound.firstTrue(0, 5, x -> true), 0);
        });
        Check.test("countInRange uses two bounds", () -> {
            Check.eq(LowerBound.countInRange(NUMS, 3, 5), 4);
            Check.eq(LowerBound.countInRange(NUMS, 6, 7), 0);
            Check.eq(LowerBound.countInRange(NUMS, 0, 100), 7);
            Check.eq(LowerBound.countInRange(NUMS, 5, 2), 0);
        });
        Check.done();
    }
}
