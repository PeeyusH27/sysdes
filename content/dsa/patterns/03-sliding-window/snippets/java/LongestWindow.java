import java.util.HashMap;
import java.util.Map;

// Template 2: variable window, LONGEST valid. Grow right; while the window breaks the rule, shrink left;
// then the window is the longest valid one ending at right. Works when shrinking a valid window keeps it valid.
// Example rule: at most k distinct characters.
public final class LongestWindow {
    private LongestWindow() {}

    public static int longestAtMostKDistinct(String s, int k) {
        Map<Character, Integer> count = new HashMap<>();   // character -> copies inside s[left..right]
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            count.merge(s.charAt(right), 1, Integer::sum);
            while (count.size() > k) {                     // invalid: too many distinct characters
                char out = s.charAt(left);
                if (count.get(out) == 1) count.remove(out);   // delete at zero so size stays honest
                else count.put(out, count.get(out) - 1);
                left++;
            }
            best = Math.max(best, right - left + 1);       // record AFTER shrinking
        }
        return best;
    }
}
