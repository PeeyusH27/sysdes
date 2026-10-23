import java.util.*;
import java.util.function.Supplier;

// Strategy: each split type turns (amount in cents, participants) into one share per participant, in order,
// or empty when the input makes no sense. Money is a long count of cents, so 10.00 is 1000 and nothing is a double.
interface SplitStrategy {
    Optional<List<Long>> split(long amount, List<String> users, List<Long> data);
}

final class Splits {
    static final Map<String, SplitStrategy> BY_TYPE = Map.of(
            "equal", (amount, users, data) -> Optional.of(spread(amount, Collections.nCopies(users.size(), 1L))),
            "shares", (amount, users, data) -> when(data.size() == users.size() && data.stream().allMatch(w -> w > 0),
                    () -> spread(amount, data)),
            "percent", (amount, users, data) -> when(data.size() == users.size() && data.stream().allMatch(p -> p > 0) && sum(data) == 100,
                    () -> spread(amount, data)),
            "exact", (amount, users, data) -> when(data.size() == users.size() && data.stream().allMatch(c -> c >= 0) && sum(data) == amount,
                    () -> data));

    private static Optional<List<Long>> when(boolean valid, Supplier<List<Long>> shares) {
        return valid ? Optional.of(shares.get()) : Optional.empty();
    }

    static long sum(List<Long> xs) { return xs.stream().mapToLong(Long::longValue).sum(); }

    // Proportional split. Floors lose under one cent per person, so the leftover is fewer cents than people: hand them
    // out one each to the first participants in the order given. The rule is fixed so the same input always gives the same bill.
    static List<Long> spread(long amount, List<Long> weights) {
        long total = sum(weights);
        List<Long> shares = new ArrayList<>();
        for (long w : weights) shares.add(amount * w / total);
        long left = amount - sum(shares);
        for (int i = 0; left > 0; i++, left--) shares.set(i, shares.get(i) + 1);
        return shares;
    }

    private Splits() {}
}
