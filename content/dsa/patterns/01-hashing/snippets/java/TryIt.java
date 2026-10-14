import java.util.Arrays;
import java.util.List;

// Edit the inputs and run. These are the four templates on this page.
public class TryIt {
    public static void main(String[] args) {
        System.out.println(SeenSet.firstRepeat(List.of(4, 7, 2, 9, 7, 1)));          // 7
        System.out.println(Frequency.countAll(Frequency.chars("banana")));            // {b=1, a=3, n=2}
        System.out.println(Frequency.canConstruct("tooth", "photo"));                 // false: only one t to spend
        System.out.println(Complement.countPairs(new int[] {1, 5, 3, 3, 3, 7}, 6));   // 4

        List<String> words = List.of("tab", "cat", "bat", "act");
        System.out.println(GroupByKey.groupBy(words, w -> {
            char[] letters = w.toCharArray();
            Arrays.sort(letters);
            return new String(letters);
        }));                                                                          // [[tab, bat], [cat, act]]
    }
}
