final class ComplementTest {
    public static void main(String[] args) {
        Check.test("counts index pairs i < j with nums[i] + nums[j] == target", () -> {
            Check.eq(Complement.countPairs(new int[] {1, 5, 3, 3, 3, 7}, 6), 4); // (1, 5) and three ways to pick two 3s
            Check.eq(Complement.countPairs(new int[] {3, 4, 2}, 6), 1);          // 3 can't pair with itself
            Check.eq(Complement.countPairs(new int[] {-2, 2, 0, 0}, 0), 2);
        });
        Check.test("returns 0 when nothing pairs up", () -> {
            Check.eq(Complement.countPairs(new int[] {1, 2, 3}, 10), 0);
            Check.eq(Complement.countPairs(new int[] {}, 0), 0);
            Check.eq(Complement.countPairs(new int[] {5}, 10), 0);
        });
        Check.done();
    }
}
