import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

// Template 4: group by a canonical key. Items that should end up together must map to the same key:
// a length, a sorted string, a count signature, an encoded coordinate...
public final class GroupByKey {
    private GroupByKey() {}

    public static <T, K> List<List<T>> groupBy(List<T> items, Function<T, K> keyOf) {
        Map<K, List<T>> groups = new LinkedHashMap<>();   // key -> items with that key, in input order
        for (T item : items) {
            groups.computeIfAbsent(keyOf.apply(item), k -> new ArrayList<>()).add(item);
        }
        return new ArrayList<>(groups.values());
    }
}
