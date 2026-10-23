import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

// Template 4: O(1) insert, remove and random pick. A list makes random picks easy, a map from value to index
// makes removal easy. Remove by copying the LAST element into the hole, then drop the last slot.
public final class RandomizedSet {
    private final List<Integer> items = new ArrayList<>();
    private final Map<Integer, Integer> index = new HashMap<>();   // value -> position in items
    private final Random random = new Random();

    public boolean insert(int val) {
        if (index.containsKey(val)) return false;
        index.put(val, items.size());
        items.add(val);
        return true;
    }

    public boolean remove(int val) {
        Integer i = index.get(val);
        if (i == null) return false;
        int last = items.get(items.size() - 1);
        items.set(i, last);   // fill the hole
        index.put(last, i);   // tell the map where the moved element lives now
        items.remove(items.size() - 1);   // remove(int) drops the last slot in O(1)
        index.remove(val);   // after the put above: if val was last, it must end up deleted
        return true;
    }

    public int getRandom() {
        return items.get(random.nextInt(items.size()));
    }

    public int size() {
        return items.size();
    }

    public boolean contains(int val) {
        return index.containsKey(val) && items.get(index.get(val)) == val;
    }
}
