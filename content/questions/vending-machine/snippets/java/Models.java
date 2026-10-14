import java.util.*;

// Money is integer cents everywhere: 0.1 + 0.2 is 0.30000000000000004 in floating point,
// and a cash box has to balance to the cent. (One javac call compiles the folder, so these
// small package-private types share a file; in a real codebase each gets its own.)
final class Coins {
    static final List<Integer> ACCEPTED = List.of(100, 25, 10, 5);  // largest first

    static int sum(Collection<Integer> coins) { return coins.stream().mapToInt(Integer::intValue).sum(); }

    private Coins() {}
}

final class Slot {
    private final String code;
    private final String product;
    private final int price;
    private final int capacity;
    private int count;

    Slot(String code, String product, int price, int count, int capacity) {
        this.code = code;
        this.product = product;
        this.price = price;
        this.count = count;
        this.capacity = capacity;
    }

    Slot(String code, String product, int price, int count) { this(code, product, price, count, 10); }

    String code() { return code; }
    String product() { return product; }
    int price() { return price; }
    int count() { return count; }
    boolean soldOut() { return count == 0; }  // a property of one slot, not a machine state

    void takeOne() { count--; }
    void restock(int n) { count = Math.min(capacity, count + n); }
}

final class Inventory {
    private final Map<String, Slot> slots = new LinkedHashMap<>();

    Inventory(List<Slot> slots) { for (Slot s : slots) this.slots.put(s.code(), s); }

    Optional<Slot> get(String code) { return Optional.ofNullable(slots.get(code)); }
    Collection<Slot> slots() { return Collections.unmodifiableCollection(slots.values()); }

    void take(String code) {
        Slot slot = slots.get(code);
        if (slot == null || slot.soldOut()) throw new IllegalStateException("Nothing left in " + code);
        slot.takeOne();
    }

    void restock(String code, int n) {
        get(code).orElseThrow(() -> new IllegalArgumentException("No slot " + code)).restock(n);
    }
}

final class CoinBox {  // the change tubes
    private final Map<Integer, Integer> counts = new LinkedHashMap<>();  // coin -> how many, largest first

    CoinBox(Map<Integer, Integer> start) {
        for (int c : Coins.ACCEPTED) counts.put(c, start.getOrDefault(c, 0));
    }

    Map<Integer, Integer> counts() { return Collections.unmodifiableMap(counts); }

    void add(List<Integer> coins) { for (int c : coins) counts.merge(c, 1, Integer::sum); }

    void remove(List<Integer> coins) {
        Map<Integer, Integer> need = new HashMap<>();
        for (int c : coins) need.merge(c, 1, Integer::sum);
        need.forEach((c, n) -> {
            if (counts.getOrDefault(c, 0) < n) {
                throw new IllegalStateException("Only " + counts.get(c) + " × " + c + "¢ left");
            }
        });
        for (int c : coins) counts.merge(c, -1, Integer::sum);  // all or nothing
    }

    Map<Integer, Integer> with(List<Integer> coins) {  // counts as if `coins` were added
        Map<Integer, Integer> copy = new LinkedHashMap<>(counts);
        for (int c : coins) copy.merge(c, 1, Integer::sum);
        return copy;
    }

    int total() {
        int t = 0;
        for (Map.Entry<Integer, Integer> e : counts.entrySet()) t += e.getKey() * e.getValue();
        return t;
    }
}
