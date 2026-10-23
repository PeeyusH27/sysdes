import java.util.*;

record Transfer(String from, String to, long cents) {}

// Who owes whom, netted per pair: if Ben owes Ana 500 and Ana then owes Ben 150, the ledger holds one fact,
// Ben owes Ana 350. Not thread-safe by itself: the Group holds the lock.
final class Ledger {
    private final Map<String, Long> owed = new HashMap<>();  // "from>to" -> cents; at most one direction per pair is non-zero

    long owes(String from, String to) { return owed.getOrDefault(from + ">" + to, 0L); }

    void add(String debtor, String creditor, long cents) {
        if (debtor.equals(creditor) || cents == 0) return;  // paying your own share creates no debt
        long net = owes(debtor, creditor) + cents - owes(creditor, debtor);  // positive: the debtor owes the creditor
        owed.put(creditor + ">" + debtor, Math.max(0, -net));
        owed.put(debtor + ">" + creditor, Math.max(0, net));
    }

    boolean settle(String from, String to, long cents) {
        if (cents <= 0 || cents > owes(from, to)) return false;  // never pay more than is owed
        owed.put(from + ">" + to, owes(from, to) - cents);
        return true;
    }

    // Net per person: positive means the group owes them, negative means they owe the group. They always add up to 0.
    Map<String, Long> balances() {
        Map<String, Long> net = new TreeMap<>();
        owed.forEach((key, cents) -> {
            String[] pair = key.split(">");
            net.merge(pair[0], -cents, Long::sum);
            net.merge(pair[1], cents, Long::sum);
        });
        return net;
    }

    // Greedy: the biggest debtor pays the biggest creditor. At most n - 1 transfers, because each one settles somebody.
    // The true minimum is NP-hard (it is a subset-sum problem), and for n people the greedy answer is never worse than n - 1.
    List<Transfer> simplify() {
        Comparator<Map.Entry<String, Long>> biggest = Map.Entry.<String, Long>comparingByValue().reversed()
                .thenComparing(Map.Entry.comparingByKey());  // ties by name, so the result is repeatable
        List<Map.Entry<String, Long>> debtors = new ArrayList<>();
        List<Map.Entry<String, Long>> creditors = new ArrayList<>();
        balances().forEach((who, n) -> {
            if (n < 0) debtors.add(new AbstractMap.SimpleEntry<>(who, -n));
            if (n > 0) creditors.add(new AbstractMap.SimpleEntry<>(who, n));
        });
        List<Transfer> plan = new ArrayList<>();
        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            debtors.sort(biggest);
            creditors.sort(biggest);
            Map.Entry<String, Long> d = debtors.get(0);
            Map.Entry<String, Long> c = creditors.get(0);
            long pay = Math.min(d.getValue(), c.getValue());
            plan.add(new Transfer(d.getKey(), c.getKey(), pay));
            d.setValue(d.getValue() - pay);
            c.setValue(c.getValue() - pay);
            if (d.getValue() == 0) debtors.remove(0);
            if (c.getValue() == 0) creditors.remove(0);
        }
        return plan;
    }
}
