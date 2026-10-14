// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out FixedWindowTest
final class FixedWindowTest {
    public static void main(String[] args) {
        Check.test("finds the best sum of k consecutive values", () -> {
            Check.eq(FixedWindow.maxWindowSum(new int[] {2, 1, 5, 1, 3, 2}, 3), 9);
            Check.eq(FixedWindow.maxWindowSum(new int[] {-1, 4, -2, 3, -5}, 2), 3);
            Check.eq(FixedWindow.maxWindowSum(new int[] {-3, -1, -2}, 1), -1);
        });
        Check.test("handles k equal to the length and invalid k", () -> {
            Check.eq(FixedWindow.maxWindowSum(new int[] {1, 2, 3}, 3), 6);
            Check.eq(FixedWindow.maxWindowSum(new int[] {1, 2}, 3), null);
            Check.eq(FixedWindow.maxWindowSum(new int[] {}, 1), null);
        });
        Check.done();
    }
}
