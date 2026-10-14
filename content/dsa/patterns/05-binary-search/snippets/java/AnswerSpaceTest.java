final class AnswerSpaceTest {
    public static void main(String[] args) {
        Check.test("smallest capacity that ships within the deadline", () -> {
            Check.eq(AnswerSpace.shipWithinDays(new int[] {4, 2, 3, 1, 2}, 3), 5);
            Check.eq(AnswerSpace.shipWithinDays(new int[] {4, 2, 3, 1, 2}, 1), 12);
            Check.eq(AnswerSpace.shipWithinDays(new int[] {4, 2, 3, 1, 2}, 5), 4);
            Check.eq(AnswerSpace.shipWithinDays(new int[] {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 5), 15);
        });
        Check.test("largest minimum gap between k placed items", () -> {
            Check.eq(AnswerSpace.maxMinDistance(new int[] {1, 2, 4, 8, 9}, 3), 3);
            Check.eq(AnswerSpace.maxMinDistance(new int[] {9, 1, 8, 4, 2}, 3), 3);
            Check.eq(AnswerSpace.maxMinDistance(new int[] {1, 2, 3, 4}, 4), 1);
            Check.eq(AnswerSpace.maxMinDistance(new int[] {0, 100}, 2), 100);
        });
        Check.done();
    }
}
