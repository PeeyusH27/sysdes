// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out LfuCacheTest
final class LfuCacheTest {
    public static void main(String[] args) {
        Check.test("evicts the least frequently used key", () -> {
            LfuCache c = new LfuCache(2);
            c.put(1, 1);
            c.put(2, 2);
            Check.eq(c.get(1), 1);   // 1 has 2 uses, 2 has 1
            c.put(3, 3);   // evicts 2
            Check.eq(c.get(2), -1);
            Check.eq(c.get(3), 3);
        });
        Check.test("ties go to the least recently used key", () -> {
            LfuCache c = new LfuCache(2);
            c.put(1, 1);
            c.put(2, 2);
            c.get(1);
            c.get(2);   // both have 2 uses; 1 is older
            c.put(3, 3);
            Check.eq(c.get(1), -1);
            Check.eq(c.get(2), 2);
            Check.eq(c.get(3), 3);
        });
        Check.test("capacity zero stores nothing and an evicted key restarts at one use", () -> {
            LfuCache zero = new LfuCache(0);
            zero.put(0, 0);
            Check.eq(zero.get(0), -1);
            LfuCache c = new LfuCache(1);
            c.put(1, 1);
            c.get(1);
            c.put(2, 2);   // evicts 1
            c.put(1, 5);   // 1 comes back with a fresh count, so it evicts 2
            Check.eq(c.get(2), -1);
            Check.eq(c.get(1), 5);
        });
        Check.done();
    }
}
