final class OverAmountTest {
    public static void main(String[] args) {
        Check.test("finds the fewest squares, even when greedy would not", () -> {
            Check.eq(3, OverAmount.numSquares(12)); // 4 + 4 + 4, while greedy takes 9 + 1 + 1 + 1
            Check.eq(2, OverAmount.numSquares(13)); // 4 + 9
            Check.eq(4, OverAmount.numSquares(7));  // 4 + 1 + 1 + 1
        });

        Check.test("handles perfect squares and the base case", () -> {
            Check.eq(0, OverAmount.numSquares(0));
            Check.eq(1, OverAmount.numSquares(1));
            Check.eq(1, OverAmount.numSquares(49));
            Check.eq(4, OverAmount.numSquares(9999)); // 9999 leaves 7 when divided by 8: no three squares can make it
        });

        Check.finish();
    }
}
