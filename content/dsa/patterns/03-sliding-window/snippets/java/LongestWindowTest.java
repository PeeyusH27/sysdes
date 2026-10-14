final class LongestWindowTest {
    public static void main(String[] args) {
        Check.test("longest substring with at most k distinct characters", () -> {
            Check.eq(LongestWindow.longestAtMostKDistinct("abcbbca", 2), 5); // "bcbbc"
            Check.eq(LongestWindow.longestAtMostKDistinct("aabbb", 1), 3);
            Check.eq(LongestWindow.longestAtMostKDistinct("abcabc", 3), 6);
        });
        Check.test("edge cases", () -> {
            Check.eq(LongestWindow.longestAtMostKDistinct("", 2), 0);
            Check.eq(LongestWindow.longestAtMostKDistinct("abc", 0), 0);
            Check.eq(LongestWindow.longestAtMostKDistinct("zzzz", 1), 4);
        });
        Check.done();
    }
}
