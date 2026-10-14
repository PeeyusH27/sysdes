// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out PrefixSumsTest
final class PrefixSumsTest {
    public static void main(String[] args) {
        Check.test("builds running sums with a leading 0", () -> {
            Check.eq(PrefixSums.buildPrefix(new int[] {3, 1, 4, 1, 5}), new int[] {0, 3, 4, 8, 9, 14});
            Check.eq(PrefixSums.buildPrefix(new int[] {}), new int[] {0});
        });
        Check.test("answers inclusive range sums", () -> {
            int[] p = PrefixSums.buildPrefix(new int[] {3, 1, 4, 1, 5});
            Check.eq(PrefixSums.rangeSum(p, 1, 3), 6);
            Check.eq(PrefixSums.rangeSum(p, 0, 4), 14);
            Check.eq(PrefixSums.rangeSum(p, 2, 2), 4);
            Check.eq(PrefixSums.rangeSum(PrefixSums.buildPrefix(new int[] {-2, 5, -1}), 0, 1), 3);
        });
        Check.done();
    }
}
