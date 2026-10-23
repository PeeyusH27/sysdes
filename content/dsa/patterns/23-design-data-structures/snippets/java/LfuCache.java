import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;

// Template 2: group keys into buckets by use count. A hit moves a key from bucket c to bucket c + 1 only,
// so eviction needs just the lowest non-empty count (minCount) and, inside it, the oldest key.
public final class LfuCache {
    private final int capacity;
    private final Map<Integer, Integer> values = new HashMap<>();   // key -> value
    private final Map<Integer, Integer> counts = new HashMap<>();   // key -> use count
    private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();   // count -> keys, oldest first
    private int minCount = 0;

    public LfuCache(int capacity) {
        this.capacity = capacity;
    }

    private void touch(int key) {
        int c = counts.get(key);
        LinkedHashSet<Integer> bucket = buckets.get(c);
        bucket.remove(key);
        if (bucket.isEmpty()) {
            buckets.remove(c);
            if (minCount == c) minCount = c + 1;   // the key itself just moved to c + 1
        }
        counts.put(key, c + 1);
        buckets.computeIfAbsent(c + 1, k -> new LinkedHashSet<>()).add(key);
    }

    public int get(int key) {
        if (!values.containsKey(key)) return -1;
        touch(key);
        return values.get(key);
    }

    public void put(int key, int value) {
        if (capacity == 0) return;
        if (values.containsKey(key)) {
            values.put(key, value);
            touch(key);
            return;
        }
        if (values.size() == capacity) {
            LinkedHashSet<Integer> bucket = buckets.get(minCount);
            int oldest = bucket.iterator().next();   // fewest uses, and the oldest among ties
            bucket.remove(oldest);
            if (bucket.isEmpty()) buckets.remove(minCount);
            values.remove(oldest);
            counts.remove(oldest);
        }
        values.put(key, value);
        counts.put(key, 1);
        buckets.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minCount = 1;   // a new key always has the lowest count
    }
}
