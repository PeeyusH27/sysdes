import java.util.List;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out TimeMapTest
final class TimeMapTest {
    public static void main(String[] args) {
        Check.test("finds the newest write at or before the time", () -> {
            TimeMap m = new TimeMap();
            m.set("love", "high", 10);
            m.set("love", "low", 20);
            Check.eq(m.get("love", 5), "");
            Check.eq(m.get("love", 10), "high");
            Check.eq(m.get("love", 15), "high");
            Check.eq(m.get("love", 20), "low");
            Check.eq(m.get("love", 99), "low");
        });
        Check.test("keys have independent histories and unknown keys are empty", () -> {
            TimeMap m = new TimeMap();
            m.set("a", "p", 1);
            m.set("b", "q", 2);
            m.set("a", "r", 3);
            Check.eq(m.get("a", 2), "p");
            Check.eq(m.get("b", 2), "q");
            Check.eq(m.get("zzz", 2), "");
        });
        Check.test("lastAtOrBefore matches a linear scan", () -> {
            List<Integer> times = List.of(2, 4, 7, 9);
            for (int t = 0; t <= 11; t++) {
                int want = -1;
                for (int i = 0; i < times.size(); i++) if (times.get(i) <= t) want = i;
                Check.eq(TimeMap.lastAtOrBefore(times, t), want);
            }
            Check.eq(TimeMap.lastAtOrBefore(List.of(), 5), -1);
        });
        Check.done();
    }
}
