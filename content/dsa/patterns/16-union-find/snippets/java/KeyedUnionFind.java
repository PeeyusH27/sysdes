import java.util.*;

// Template 4: union-find over arbitrary keys (emails, words, "r,c" cells) with union by size.
// Keys are added the first time they are seen, so nothing has to be numbered up front,
// and every root knows how many items its group holds.
class KeyedUnionFind<T> {
    private final Map<T, T> parent = new LinkedHashMap<>();
    private final Map<T, Integer> sizes = new HashMap<>(); // root -> number of items in its group

    void add(T x) {
        if (!parent.containsKey(x)) {
            parent.put(x, x);
            sizes.put(x, 1);
        }
    }

    T find(T x) {
        add(x);
        T root = x;
        while (!parent.get(root).equals(root)) root = parent.get(root);
        while (!parent.get(x).equals(root)) {   // path compression
            T next = parent.get(x);
            parent.put(x, root);
            x = next;
        }
        return root;
    }

    boolean union(T a, T b) {
        T ra = find(a);
        T rb = find(b);
        if (ra.equals(rb)) return false;
        if (sizes.get(ra) < sizes.get(rb)) {
            T tmp = ra;
            ra = rb;
            rb = tmp;
        }
        parent.put(rb, ra);                      // union by size: the smaller group joins the larger
        sizes.put(ra, sizes.get(ra) + sizes.get(rb));
        return true;
    }

    int sizeOf(T x) {
        return sizes.get(find(x));
    }

    List<List<T>> groups() {
        Map<T, List<T>> out = new LinkedHashMap<>();
        for (T x : new ArrayList<>(parent.keySet())) { // a copy: find() may touch the map while we loop
            out.computeIfAbsent(find(x), r -> new ArrayList<>()).add(x);
        }
        return new ArrayList<>(out.values());
    }
}
