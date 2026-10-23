import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

// Template 1: a hash map for O(1) lookup + a doubly linked list for O(1) "move to front" and "evict the oldest".
// head.next is the most recently used entry, tail.prev the least recently used. Sentinels remove edge cases.
public final class LruCache {
    private static final class Entry {
        final int key;
        int val;
        Entry prev;
        Entry next;

        Entry(int key, int val) {
            this.key = key;
            this.val = val;
        }
    }

    private final int capacity;
    private final Map<Integer, Entry> entries = new HashMap<>();   // key -> Entry
    private final Entry head = new Entry(0, 0);
    private final Entry tail = new Entry(0, 0);

    public LruCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    private void unlink(Entry e) {
        e.prev.next = e.next;
        e.next.prev = e.prev;
    }

    private void pushFront(Entry e) {
        e.prev = head;
        e.next = head.next;
        head.next.prev = e;
        head.next = e;
    }

    public int get(int key) {
        Entry e = entries.get(key);
        if (e == null) return -1;
        unlink(e);   // a read is a use: move to the front
        pushFront(e);
        return e.val;
    }

    public void put(int key, int value) {
        Entry old = entries.get(key);
        if (old != null) {
            old.val = value;
            unlink(old);
            pushFront(old);
            return;
        }
        if (entries.size() == capacity) {
            Entry lru = tail.prev;   // nobody touched it for the longest time
            unlink(lru);
            entries.remove(lru.key);   // the node remembers its key for exactly this
        }
        Entry e = new Entry(key, value);
        entries.put(key, e);
        pushFront(e);
    }

    // The shortcut: LinkedHashMap iterates in insertion order, so remove + put moves a key to the end.
    public static final class Ordered {
        private final int capacity;
        private final LinkedHashMap<Integer, Integer> map = new LinkedHashMap<>();   // oldest key first

        public Ordered(int capacity) {
            this.capacity = capacity;
        }

        public int get(int key) {
            Integer value = map.remove(key);
            if (value == null) return -1;
            map.put(key, value);   // now the newest
            return value;
        }

        public void put(int key, int value) {
            map.remove(key);
            if (map.size() == capacity) map.remove(map.keySet().iterator().next());   // evict the oldest
            map.put(key, value);
        }
    }
}
