import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.LongSupplier;

enum Removal { EVICTED, EXPIRED, DELETED }

// Observer: metrics, write-back and logging listen without the cache knowing them.
interface RemovalListener<K, V> {
    void removed(K key, V value, Removal why);
}

record Stats(long hits, long misses, long evictions) {}

final class Cache<K, V> {
    private record Entry<T>(T value, long expiresAt) {}
    private record Removed<A, B>(A key, B value, Removal why) {}

    private final int capacity;
    private final EvictionPolicy<K> policy;
    private final long ttlMs;
    private final LongSupplier clock;  // injected, so tests and TTL logic never read the real clock
    private final Map<K, Entry<V>> entries = new HashMap<>();
    private final List<RemovalListener<K, V>> listeners = new CopyOnWriteArrayList<>();
    // One lock for everything: get() also changes the order, so even reads need exclusive access.
    private final ReentrantLock lock = new ReentrantLock();
    private long hits;
    private long misses;
    private long evictions;

    Cache(int capacity, EvictionPolicy<K> policy, long ttlMs, LongSupplier clock) {
        if (capacity < 1) throw new IllegalArgumentException("capacity must be at least 1");
        this.capacity = capacity;
        this.policy = policy;
        this.ttlMs = ttlMs;
        this.clock = clock;
    }

    Cache(int capacity) { this(capacity, new LruPolicy<>(), Long.MAX_VALUE, System::currentTimeMillis); }

    void onRemove(RemovalListener<K, V> listener) { listeners.add(listener); }

    int size() {
        lock.lock();
        try { return entries.size(); } finally { lock.unlock(); }
    }

    Stats stats() {
        lock.lock();
        try { return new Stats(hits, misses, evictions); } finally { lock.unlock(); }
    }

    Optional<V> get(K key) {
        List<Removed<K, V>> gone = new ArrayList<>();
        Optional<V> result;
        lock.lock();
        try {
            Entry<V> e = entries.get(key);
            if (e != null && e.expiresAt() <= clock.getAsLong()) {  // lazy expiry
                remove(key, Removal.EXPIRED, gone);
                e = null;
            }
            if (e == null) {
                misses++;
                result = Optional.empty();
            } else {
                policy.onAccess(key);
                hits++;
                result = Optional.of(e.value());
            }
        } finally {
            lock.unlock();
        }
        fire(gone);  // listeners run outside the lock, so a slow or re-entrant one cannot block or deadlock the cache
        return result;
    }

    void put(K key, V value) { put(key, value, ttlMs); }

    void put(K key, V value, long ttl) {
        List<Removed<K, V>> gone = new ArrayList<>();
        lock.lock();
        try {
            long now = clock.getAsLong();
            Entry<V> entry = new Entry<>(value, ttl > Long.MAX_VALUE - now ? Long.MAX_VALUE : now + ttl);
            if (entries.containsKey(key)) {
                entries.put(key, entry);
                policy.onAccess(key);
            } else {
                if (entries.size() >= capacity) remove(policy.victim(), Removal.EVICTED, gone);
                entries.put(key, entry);
                policy.onInsert(key);
            }
        } finally {
            lock.unlock();
        }
        fire(gone);
    }

    boolean delete(K key) {
        List<Removed<K, V>> gone = new ArrayList<>();
        lock.lock();
        try {
            if (!entries.containsKey(key)) return false;
            remove(key, Removal.DELETED, gone);
        } finally {
            lock.unlock();
        }
        fire(gone);
        return true;
    }

    private void remove(K key, Removal why, List<Removed<K, V>> gone) {  // caller holds the lock
        Entry<V> e = entries.remove(key);
        policy.onRemove(key);
        if (why == Removal.EVICTED) evictions++;
        gone.add(new Removed<>(key, e.value(), why));
    }

    private void fire(List<Removed<K, V>> gone) {
        for (Removed<K, V> r : gone) for (RemovalListener<K, V> l : listeners) l.removed(r.key(), r.value(), r.why());
    }
}
