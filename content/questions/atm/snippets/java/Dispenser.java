import java.util.*;

// Chain of Responsibility: each handler owns one note value, takes what it can, and hands the rest on.
final class NoteHandler {
    private final int denom;
    private final NoteHandler next;

    NoteHandler(int denom, NoteHandler next) {
        this.denom = denom;
        this.next = next;
    }

    // Notes that add up to exactly `amount`, or empty. Try the most notes first, then fewer: taking a 50
    // greedily when you owe 60 from one 50 and three 20s would strand the last 10.
    Optional<Map<Integer, Integer>> plan(int amount, Map<Integer, Integer> stock) {
        int most = Math.min(amount / denom, stock.getOrDefault(denom, 0));
        for (int n = most; n >= 0; n--) {
            int rest = amount - n * denom;
            Optional<Map<Integer, Integer>> tail;
            if (next != null) {
                tail = next.plan(rest, stock);
            } else {
                tail = rest == 0 ? Optional.of(Map.of()) : Optional.empty();
            }
            if (tail.isPresent()) {
                Map<Integer, Integer> out = new LinkedHashMap<>();
                if (n > 0) out.put(denom, n);
                out.putAll(tail.get());
                return Optional.of(out);
            }
        }
        return Optional.empty();
    }

    // A new note value is one more entry in `denoms` (largest first); no existing class changes.
    static NoteHandler chain(List<Integer> denoms) {
        NoteHandler head = null;
        for (int i = denoms.size() - 1; i >= 0; i--) head = new NoteHandler(denoms.get(i), head);
        return head;
    }
}
