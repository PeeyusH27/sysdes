import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/lru *.java && java -cp /tmp/lru CacheTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class CacheTest {
    public static void main(String[] args) {
        test("evicts the least recently used key", CacheTest::evictsLru);
        test("updating an existing key refreshes it and never evicts", CacheTest::updateRefreshes);
        test("capacity 1 keeps only the latest key", CacheTest::capacityOne);
        test("FIFO ignores reads, so the same sequence evicts a different key", CacheTest::fifo);
        test("delete frees a slot and leaves no ghost in the policy", CacheTest::deleteNoGhost);
        test("an entry expires exactly at its deadline (injected clock)", CacheTest::expiresAtDeadline);
        test("a per-key TTL overrides the default, and a hit does not extend it", CacheTest::perKeyTtl);
        test("listeners hear about evictions, expiries and deletes with the reason", CacheTest::listeners);
        test("stats count hits, misses and evictions", CacheTest::stats);
        test("rejects a capacity below 1", CacheTest::badCapacity);
        test("matches a simple LinkedHashMap model over 2,000 random operations", CacheTest::randomModel);
        test("8 threads, 20,000 operations: never over capacity, no exception", CacheTest::concurrent);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static Cache<String, Integer> lru(int capacity) { return new Cache<>(capacity); }

    static void fill(Cache<String, Integer> c, String... keys) {
        for (int i = 0; i < keys.length; i++) c.put(keys[i], i);
    }

    static void evictsLru() {
        Cache<String, Integer> c = lru(2);
        fill(c, "a", "b");
        c.get("a");  // a is now newer than b
        c.put("c", 9);
        check(c.get("b").isEmpty(), "b was evicted");
        check(c.get("a").equals(Optional.of(0)) && c.get("c").equals(Optional.of(9)), "a and c stay");
    }

    static void updateRefreshes() {
        Cache<String, Integer> c = lru(2);
        fill(c, "a", "b");
        c.put("a", 10);
        check(c.size() == 2, "size stays 2");
        c.put("c", 1);  // b is the oldest now
        check(c.get("b").isEmpty(), "b was evicted");
        check(c.get("a").equals(Optional.of(10)), "a has the new value");
    }

    static void capacityOne() {
        Cache<String, Integer> c = lru(1);
        fill(c, "a", "b");
        check(c.get("a").isEmpty() && c.get("b").equals(Optional.of(1)) && c.size() == 1, "only b");
    }

    static void fifo() {
        Cache<String, Integer> c = new Cache<>(2, new FifoPolicy<>(), Long.MAX_VALUE, System::currentTimeMillis);
        fill(c, "a", "b");
        c.get("a");
        c.put("c", 9);
        check(c.get("a").isEmpty(), "LRU would have kept a");
        check(c.get("b").equals(Optional.of(1)), "b stays");
    }

    static void deleteNoGhost() {
        Cache<String, Integer> c = lru(2);
        fill(c, "a", "b");
        check(c.delete("a"), "first delete");
        check(!c.delete("a"), "second delete");
        c.put("c", 2);  // fits without evicting
        c.put("d", 3);  // now b is the oldest
        check(c.get("b").isEmpty() && c.size() == 2, "b evicted, two left");
    }

    static void expiresAtDeadline() {
        AtomicLong t = new AtomicLong(1000);
        Cache<String, Integer> c = new Cache<>(3, new LruPolicy<>(), 100, t::get);
        c.put("a", 1);
        t.set(1099);
        check(c.get("a").equals(Optional.of(1)), "alive at 1099");
        t.set(1100);
        check(c.get("a").isEmpty() && c.size() == 0, "gone at 1100");
    }

    static void perKeyTtl() {
        AtomicLong t = new AtomicLong(0);
        Cache<String, Integer> c = new Cache<>(3, new LruPolicy<>(), 100, t::get);
        c.put("short", 1, 10);
        c.put("long", 2);
        t.set(50);
        check(c.get("long").equals(Optional.of(2)), "long is alive");
        check(c.get("short").isEmpty(), "short expired");
        t.set(100);
        check(c.get("long").isEmpty(), "a hit did not extend the TTL");
    }

    static void listeners() {
        AtomicLong t = new AtomicLong(0);
        Cache<String, Integer> c = new Cache<>(2, new LruPolicy<>(), 50, t::get);
        List<String> seen = new ArrayList<>();
        c.onRemove((k, v, why) -> seen.add(k + ":" + v + ":" + why));
        fill(c, "a", "b");
        c.put("c", 7);  // evicts a
        c.delete("b");
        t.set(60);
        c.get("c");  // expired
        check(seen.equals(List.of("a:0:EVICTED", "b:1:DELETED", "c:7:EXPIRED")), seen.toString());
    }

    static void stats() {
        Cache<String, Integer> c = lru(1);
        c.put("a", 1);
        c.get("a");
        c.get("x");
        c.put("b", 2);
        check(c.stats().equals(new Stats(1, 1, 1)), c.stats().toString());
    }

    static void badCapacity() {
        try {
            lru(0);
        } catch (IllegalArgumentException e) {
            return;
        }
        check(false, "expected IllegalArgumentException");
    }

    static void randomModel() {
        Random rnd = new Random(7);
        Cache<String, Integer> c = lru(4);
        LinkedHashMap<String, Integer> model = new LinkedHashMap<>();  // re-insert on use: oldest first
        for (int i = 0; i < 2000; i++) {
            String k = "k" + rnd.nextInt(9);
            if (rnd.nextBoolean()) {
                c.put(k, i);
                if (!model.containsKey(k) && model.size() == 4) model.remove(model.keySet().iterator().next());
                model.remove(k);
                model.put(k, i);
            } else {
                Integer want = model.get(k);
                if (want != null) { model.remove(k); model.put(k, want); }
                check(c.get(k).equals(Optional.ofNullable(want)), "get " + k + " at step " + i);
            }
            check(c.size() == model.size(), "size at step " + i);
        }
    }

    static void concurrent() {
        Cache<Integer, Integer> c = new Cache<>(50);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> done = new ArrayList<>();
        for (int w = 0; w < 8; w++) {
            final int seed = w;
            done.add(pool.submit(() -> {
                Random rnd = new Random(seed);
                for (int i = 0; i < 2500; i++) {
                    int k = rnd.nextInt(200);
                    if (rnd.nextInt(3) == 0) c.put(k, i); else c.get(k);
                    if (c.size() > 50) throw new IllegalStateException("over capacity: " + c.size());
                }
            }));
        }
        try {
            for (Future<?> f : done) f.get(30, TimeUnit.SECONDS);
        } catch (Exception e) {
            throw new AssertionError(e);
        } finally {
            pool.shutdownNow();
        }
        Stats s = c.stats();
        check(s.hits() + s.misses() > 0 && c.size() <= 50, "stats and size are sane");
    }

    // ---- a tiny test harness
    interface Body { void run() throws Exception; }

    private static int failed = 0;

    static void test(String name, Body body) {
        try {
            body.run();
            System.out.println("PASS  " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL  " + name + "\n      " + e);
        }
    }

    static void check(boolean ok, String what) {
        if (!ok) throw new AssertionError(what);
    }
}
