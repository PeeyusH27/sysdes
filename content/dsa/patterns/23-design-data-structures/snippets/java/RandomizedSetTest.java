import java.util.HashSet;
import java.util.Set;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out RandomizedSetTest
final class RandomizedSetTest {
    public static void main(String[] args) {
        Check.test("insert and remove report whether anything changed", () -> {
            RandomizedSet s = new RandomizedSet();
            Check.eq(s.insert(1), true);
            Check.eq(s.insert(1), false);
            Check.eq(s.remove(2), false);
            Check.eq(s.insert(2), true);
            Check.eq(s.remove(1), true);
            Check.eq(s.getRandom(), 2);
        });
        Check.test("removing the last element or a middle one keeps the structure consistent", () -> {
            RandomizedSet s = new RandomizedSet();
            for (int v : new int[] {4, 5, 6, 7}) s.insert(v);
            Check.eq(s.remove(7), true);   // last element
            Check.eq(s.remove(4), true);   // middle: 6 moves into slot 0
            Check.eq(s.remove(4), false);
            Check.eq(s.size(), 2);
            Check.eq(s.contains(5), true);
            Check.eq(s.contains(6), true);
            Check.eq(s.contains(4), false);
        });
        Check.test("getRandom returns members and eventually every member", () -> {
            RandomizedSet s = new RandomizedSet();
            for (int v : new int[] {0, 1, 2}) s.insert(v);   // 0 on purpose
            Set<Integer> seen = new HashSet<>();
            for (int i = 0; i < 300; i++) seen.add(s.getRandom());
            Check.eq(seen.size(), 3);
            Check.eq(seen.contains(0) && seen.contains(1) && seen.contains(2), true);
        });
        Check.done();
    }
}
