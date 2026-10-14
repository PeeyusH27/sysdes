final class XorTricksTest {
    public static void main(String[] args) {
        Check.test("pairs cancel and the odd one out remains", () -> {
            Check.eq(9, XorTricks.xorAll(new int[] {5, 9, 3, 12, 3, 5, 12}));
            Check.eq(-4, XorTricks.xorAll(new int[] {2, -4, 2}));
            Check.eq(0, XorTricks.xorAll(new int[0]));
        });

        Check.test("finds the missing number in 0..n", () -> {
            Check.eq(2, XorTricks.missingNumber(new int[] {4, 0, 1, 3}));
            Check.eq(3, XorTricks.missingNumber(new int[] {0, 1, 2}));
            Check.eq(0, XorTricks.missingNumber(new int[] {1}));
        });

        Check.test("separates two single values", () -> {
            Check.eq(new int[] {3, 5}, XorTricks.twoSingles(new int[] {1, 2, 1, 3, 2, 5}));
            Check.eq(new int[] {-1, 0}, XorTricks.twoSingles(new int[] {-1, 0}));
            Check.eq(new int[] {6, 9}, XorTricks.twoSingles(new int[] {4, 7, 4, 9, 7, 6}));
        });

        Check.finish();
    }
}
