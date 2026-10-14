import java.util.List;

final class CombinationsTest {
    static long choose(int n, int k) {
        return k == 0 ? 1 : choose(n - 1, k - 1) * n / k;
    }

    public static void main(String[] args) {
        Check.test("lists every k-combination once, in increasing order", () -> {
            Check.eq(List.of(List.of(1, 2), List.of(1, 3), List.of(1, 4), List.of(2, 3), List.of(2, 4), List.of(3, 4)), Combinations.combinations(4, 2));
            Check.eq(List.of(List.of(1, 2, 3)), Combinations.combinations(3, 3));
            Check.eq(List.of(List.of(1), List.of(2), List.of(3)), Combinations.combinations(3, 1));
        });

        Check.test("counts match n choose k", () -> {
            for (int[] nk : new int[][] {{5, 2}, {6, 3}, {8, 4}, {7, 0}}) {
                Check.eq(choose(nk[0], nk[1]), (long) Combinations.combinations(nk[0], nk[1]).size());
            }
        });

        Check.finish();
    }
}
