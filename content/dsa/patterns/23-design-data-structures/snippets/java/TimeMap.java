import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Template 3: keep every key's history in time order (appends keep it sorted), then binary search it.
// lastAtOrBefore returns the index of the newest entry with time <= t, or -1.
public final class TimeMap {
    private static final class Log {
        final List<Integer> times = new ArrayList<>();
        final List<String> values = new ArrayList<>();
    }

    private final Map<String, Log> history = new HashMap<>();   // key -> writes sorted by time

    public static int lastAtOrBefore(List<Integer> times, int t) {
        int lo = 0;
        int hi = times.size();   // hi: first index whose time is greater than t
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (times.get(mid) <= t) lo = mid + 1;
            else hi = mid;
        }
        return lo - 1;
    }

    public void set(String key, String value, int time) {
        Log log = history.computeIfAbsent(key, k -> new Log());
        log.times.add(time);
        log.values.add(value);
    }

    public String get(String key, int time) {
        Log log = history.get(key);
        if (log == null) return "";
        int i = lastAtOrBefore(log.times, time);
        return i == -1 ? "" : log.values.get(i);
    }
}
