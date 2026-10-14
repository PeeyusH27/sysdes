import java.util.Arrays;
import java.util.List;
import java.util.function.Function;

final class GroupByKeyTest {
    public static void main(String[] args) {
        Check.test("groups by any computed key, keeping input order", () -> {
            Check.eq(GroupByKey.groupBy(List.of("ant", "bee", "goat", "cat", "deer"), String::length),
                    List.of(List.of("ant", "bee", "cat"), List.of("goat", "deer")));
            Check.eq(GroupByKey.groupBy(List.of(1, 2, 3, 4, 5, 6), n -> n % 3),
                    List.of(List.of(1, 4), List.of(2, 5), List.of(3, 6)));
        });
        Check.test("a sorted-letters key groups anagrams", () -> {
            Function<String, String> sorted = w -> {
                char[] letters = w.toCharArray();
                Arrays.sort(letters);
                return new String(letters);
            };
            Check.eq(GroupByKey.groupBy(List.of("tab", "cat", "bat", "act"), sorted),
                    List.of(List.of("tab", "bat"), List.of("cat", "act")));
            Check.eq(GroupByKey.groupBy(List.<String>of(), sorted), List.of());
        });
        Check.done();
    }
}
