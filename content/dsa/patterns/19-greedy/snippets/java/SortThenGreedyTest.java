final class SortThenGreedyTest {
    public static void main(String[] args) {
        Check.test("feeds the most children", () -> {
            Check.eq(4, SortThenGreedy.findContentChildren(new int[] {3, 1, 6, 2, 4}, new int[] {2, 1, 5, 3, 1}));
            Check.eq(1, SortThenGreedy.findContentChildren(new int[] {7, 4, 5}, new int[] {3, 1, 6, 2}));
            Check.eq(2, SortThenGreedy.findContentChildren(new int[] {1, 2}, new int[] {1, 2, 3}));
        });

        Check.test("handles nothing to give or nobody to feed", () -> {
            Check.eq(0, SortThenGreedy.findContentChildren(new int[] {1, 2}, new int[0]));
            Check.eq(0, SortThenGreedy.findContentChildren(new int[0], new int[] {4}));
        });

        Check.test("does not reorder the inputs", () -> {
            int[] greed = {3, 1};
            SortThenGreedy.findContentChildren(greed, new int[] {5, 1});
            Check.eq(new int[] {3, 1}, greed);
        });

        Check.finish();
    }
}
