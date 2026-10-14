final class RotatedTest {
    public static void main(String[] args) {
        Check.test("finds the rotation point for every rotation", () -> {
            int[] sorted = {2, 5, 8, 11, 14, 17, 20};
            int n = sorted.length;
            for (int k = 0; k < n; k++) {
                int[] rotated = new int[n];
                for (int i = 0; i < n; i++) rotated[i] = sorted[(i + k) % n];
                Check.eq(Rotated.findMinIndex(rotated), (n - k) % n);
            }
        });
        Check.test("handles one and two elements", () -> {
            Check.eq(Rotated.findMinIndex(new int[] {7}), 0);
            Check.eq(Rotated.findMinIndex(new int[] {4, 1}), 1);
            Check.eq(Rotated.findMinIndex(new int[] {1, 4}), 0);
        });
        Check.done();
    }
}
