import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

record Result(boolean ok, String reason, Map<String, Long> shares) {
    static Result rejected(String reason) { return new Result(false, reason, Map.of()); }
}

final class Group {
    private final Set<String> members;
    private final Ledger ledger = new Ledger();
    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();
    private final Object lock = new Object();  // one lock per group: a settle-up cannot interleave with an expense
    private int expenses;

    Group(Collection<String> members) { this.members = new HashSet<>(members); }

    void onEvent(Consumer<String> listener) { listeners.add(listener); }  // observer: push notifications, activity feed

    Result addExpense(String payer, long amount, String type, List<String> users, List<Long> data) {
        Result result;
        synchronized (lock) {
            SplitStrategy split = Splits.BY_TYPE.get(type);
            boolean known = members.contains(payer) && members.containsAll(users);
            if (split == null || !known || users.isEmpty() || new HashSet<>(users).size() != users.size()) {
                return Result.rejected("invalid participants");
            }
            if (amount <= 0) return Result.rejected("invalid amount");
            Optional<List<Long>> shares = split.split(amount, users, data);  // validate first: a bad expense never half-applies
            if (shares.isEmpty()) return Result.rejected("invalid " + type + " split");
            Map<String, Long> byUser = new LinkedHashMap<>();
            for (int i = 0; i < users.size(); i++) {
                ledger.add(users.get(i), payer, shares.get().get(i));  // every participant owes the payer their share
                byUser.put(users.get(i), shares.get().get(i));
            }
            expenses++;
            result = new Result(true, "", byUser);
        }
        listeners.forEach(l -> l.accept("expense"));  // after unlocking, so a slow listener cannot block the group
        return result;
    }

    Result addExpense(String payer, long amount, String type, List<String> users) {
        return addExpense(payer, amount, type, users, List.of());
    }

    Result settleUp(String from, String to, long cents) {
        synchronized (lock) {
            // check and subtract in one locked step: two racing settle-ups cannot both pay the same debt
            if (!members.contains(from) || !members.contains(to) || !ledger.settle(from, to, cents)) {
                return Result.rejected("nothing to settle");
            }
        }
        listeners.forEach(l -> l.accept("settled"));
        return new Result(true, "", Map.of());
    }

    long owes(String from, String to) { synchronized (lock) { return ledger.owes(from, to); } }
    Map<String, Long> balances() { synchronized (lock) { return ledger.balances(); } }
    List<Transfer> simplify() { synchronized (lock) { return ledger.simplify(); } }
    int expenseCount() { synchronized (lock) { return expenses; } }
}
