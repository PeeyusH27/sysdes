import java.util.List;

final class ArrangementsTest {
    public static void main(String[] args) {
        Check.test("ordered selections of k items", () -> {
            Check.eq(List.of(List.of("a", "b"), List.of("a", "c"), List.of("b", "a"), List.of("b", "c"), List.of("c", "a"), List.of("c", "b")),
                    Arrangements.arrangements(List.of("a", "b", "c"), 2));
        });

        Check.test("k defaults to every item: all permutations", () -> {
            Check.eq(List.of(List.of(1, 2, 3), List.of(1, 3, 2), List.of(2, 1, 3), List.of(2, 3, 1), List.of(3, 1, 2), List.of(3, 2, 1)),
                    Arrangements.arrangements(List.of(1, 2, 3)));
            Check.eq(List.of(List.of(7)), Arrangements.arrangements(List.of(7)));
            Check.eq(120, Arrangements.arrangements(List.of(1, 2, 3, 4, 5)).size());
        });

        Check.finish();
    }
}
