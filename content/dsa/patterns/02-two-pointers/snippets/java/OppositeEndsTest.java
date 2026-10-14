// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out OppositeEndsTest
final class OppositeEndsTest {
    public static void main(String[] args) {
        Check.test("finds the pair in a sorted array", () -> {
            Check.eq(OppositeEnds.pairSum(new int[] {1, 3, 4, 6, 8, 11}, 10), new int[] {2, 3});
            Check.eq(OppositeEnds.pairSum(new int[] {-3, -1, 0, 2, 5}, -4), new int[] {0, 1});
        });
        Check.test("returns [-1, -1] when no pair exists", () -> {
            Check.eq(OppositeEnds.pairSum(new int[] {2, 4, 5, 9}, 12), new int[] {-1, -1});
            Check.eq(OppositeEnds.pairSum(new int[] {}, 1), new int[] {-1, -1});
        });
        Check.done();
    }
}
