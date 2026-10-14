final class WindowMaxTest {
    public static void main(String[] args) {
        Check.test("maximum of every window of size k", () -> {
            Check.eq(WindowMax.windowMax(new int[] {5, 3, 4, 1, 6, 2, 2}, 3), new int[] {5, 4, 6, 6, 6});
            Check.eq(WindowMax.windowMax(new int[] {9, 7, 5, 3, 1}, 3), new int[] {9, 7, 5});
            Check.eq(WindowMax.windowMax(new int[] {1, 2, 3, 4}, 2), new int[] {2, 3, 4});
        });
        Check.test("k = 1 and k = n", () -> {
            Check.eq(WindowMax.windowMax(new int[] {4, -1, 2}, 1), new int[] {4, -1, 2});
            Check.eq(WindowMax.windowMax(new int[] {4, -1, 2}, 3), new int[] {4});
            Check.eq(WindowMax.windowMax(new int[] {}, 2), new int[] {});
        });
        Check.done();
    }
}
