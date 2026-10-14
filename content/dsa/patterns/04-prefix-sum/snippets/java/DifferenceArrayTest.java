final class DifferenceArrayTest {
    public static void main(String[] args) {
        Check.test("applies many range additions with one final pass", () -> {
            Check.eq(DifferenceArray.applyRangeAdds(6, new int[][] {{1, 3, 2}, {2, 5, 3}, {0, 1, -1}}), new int[] {-1, 1, 5, 5, 3, 3});
            Check.eq(DifferenceArray.applyRangeAdds(4, new int[][] {{0, 3, 1}, {0, 3, 1}}), new int[] {2, 2, 2, 2});
        });
        Check.test("single cells and no updates", () -> {
            Check.eq(DifferenceArray.applyRangeAdds(3, new int[][] {{2, 2, 5}}), new int[] {0, 0, 5});
            Check.eq(DifferenceArray.applyRangeAdds(3, new int[][] {}), new int[] {0, 0, 0});
        });
        Check.done();
    }
}
