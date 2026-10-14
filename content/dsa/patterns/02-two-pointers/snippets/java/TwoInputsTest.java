final class TwoInputsTest {
    public static void main(String[] args) {
        Check.test("squares of a sorted array stay sorted", () -> {
            Check.eq(TwoInputs.sortedSquares(new int[] {-4, -1, 0, 3, 10}), new int[] {0, 1, 9, 16, 100});
            Check.eq(TwoInputs.sortedSquares(new int[] {-7, -3, 2, 3, 11}), new int[] {4, 9, 9, 49, 121});
        });
        Check.test("merges two sorted arrays", () -> {
            Check.eq(TwoInputs.mergeSorted(new int[] {1, 4, 9}, new int[] {2, 3, 10, 12}), new int[] {1, 2, 3, 4, 9, 10, 12});
            Check.eq(TwoInputs.mergeSorted(new int[] {}, new int[] {5}), new int[] {5});
        });
        Check.done();
    }
}
