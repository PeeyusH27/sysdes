import java.util.List;
import java.util.Map;

final class FrequencyTest {
    public static void main(String[] args) {
        Check.test("counts every value", () -> {
            Map<Character, Integer> count = Frequency.countAll(Frequency.chars("banana"));
            Check.eq(List.copyOf(count.entrySet()), List.of(Map.entry('b', 1), Map.entry('a', 3), Map.entry('n', 2)));
            Check.eq(Frequency.countAll(List.of()).size(), 0);
        });
        Check.test("spends letters like a budget", () -> {
            Check.eq(Frequency.canConstruct("noon", "onion"), true);
            Check.eq(Frequency.canConstruct("tooth", "photo"), false);
            Check.eq(Frequency.canConstruct("", "abc"), true);
            Check.eq(Frequency.canConstruct("a", ""), false);
        });
        Check.done();
    }
}
