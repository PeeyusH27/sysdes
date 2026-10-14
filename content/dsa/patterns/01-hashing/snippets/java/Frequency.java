import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Template 2: a frequency map. Count once, then answer "how many?" for any value in O(1).
public final class Frequency {
    private Frequency() {}

    // LinkedHashMap keeps first-seen order, like a JavaScript Map.
    public static <T> Map<T, Integer> countAll(Iterable<T> items) {
        Map<T, Integer> count = new LinkedHashMap<>();
        for (T x : items) count.put(x, count.getOrDefault(x, 0) + 1);
        return count;
    }

    /** The characters of a string as a list, so countAll can count them. */
    public static List<Character> chars(String s) {
        List<Character> out = new ArrayList<>();
        for (char ch : s.toCharArray()) out.add(ch);
        return out;
    }

    // Counting as a budget: can `note` be written using each letter of `magazine` at most once?
    public static boolean canConstruct(String note, String magazine) {
        Map<Character, Integer> count = countAll(chars(magazine));
        for (char ch : note.toCharArray()) {
            int left = count.getOrDefault(ch, 0);
            if (left == 0) return false;   // this letter has run out
            count.put(ch, left - 1);       // spend one copy
        }
        return true;
    }
}
