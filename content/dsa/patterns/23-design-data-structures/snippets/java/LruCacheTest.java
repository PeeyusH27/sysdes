// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out LruCacheTest
final class LruCacheTest {
    public static void main(String[] args) {
        Check.test("evicts the least recently used key", () -> {
            LruCache c = new LruCache(2);
            c.put(1, 1);
            c.put(2, 2);
            Check.eq(c.get(1), 1);   // 1 is now the newest
            c.put(3, 3);   // evicts 2
            Check.eq(c.get(2), -1);
            c.put(4, 4);   // evicts 1
            Check.eq(c.get(1), -1);
            Check.eq(c.get(3), 3);
            Check.eq(c.get(4), 4);
            LruCache.Ordered o = new LruCache.Ordered(2);
            o.put(1, 1);
            o.put(2, 2);
            Check.eq(o.get(1), 1);
            o.put(3, 3);
            Check.eq(o.get(2), -1);
            o.put(4, 4);
            Check.eq(o.get(1), -1);
            Check.eq(o.get(3), 3);
            Check.eq(o.get(4), 4);
        });
        Check.test("updating a key counts as a use and never grows the cache", () -> {
            LruCache c = new LruCache(2);
            c.put(2, 1);
            c.put(2, 2);
            Check.eq(c.get(2), 2);
            c.put(1, 1);
            c.put(4, 1);   // evicts 2
            Check.eq(c.get(2), -1);
            Check.eq(c.get(1), 1);
            LruCache.Ordered o = new LruCache.Ordered(2);
            o.put(2, 1);
            o.put(2, 2);
            Check.eq(o.get(2), 2);
            o.put(1, 1);
            o.put(4, 1);
            Check.eq(o.get(2), -1);
            Check.eq(o.get(1), 1);
        });
        Check.test("capacity one keeps only the newest key", () -> {
            LruCache c = new LruCache(1);
            c.put(1, 10);
            c.put(2, 20);
            Check.eq(c.get(1), -1);
            Check.eq(c.get(2), 20);
            LruCache.Ordered o = new LruCache.Ordered(1);
            o.put(1, 10);
            o.put(2, 20);
            Check.eq(o.get(1), -1);
            Check.eq(o.get(2), 20);
        });
        Check.done();
    }
}
