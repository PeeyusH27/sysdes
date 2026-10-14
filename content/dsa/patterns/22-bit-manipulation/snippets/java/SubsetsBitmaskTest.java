import java.util.List;

final class SubsetsBitmaskTest {
    public static void main(String[] args) {
        Check.test("lists all 2^n subsets in mask order", () -> {
            Check.eq(List.of(List.of(), List.of("a"), List.of("b"), List.of("a", "b"), List.of("c"), List.of("a", "c"), List.of("b", "c"), List.of("a", "b", "c")),
                    SubsetsBitmask.subsets(List.of("a", "b", "c")));
            Check.eq(List.of(List.of()), SubsetsBitmask.subsets(List.of()));
            Check.eq(32, SubsetsBitmask.subsets(List.of(1, 2, 3, 4, 5)).size());
        });

        Check.test("enumerates the submasks of a mask", () -> {
            Check.eq(List.of(0b1011, 0b1010, 0b1001, 0b1000, 0b0011, 0b0010, 0b0001, 0), SubsetsBitmask.submasks(0b1011));
            Check.eq(List.of(0), SubsetsBitmask.submasks(0));
        });

        Check.finish();
    }
}
