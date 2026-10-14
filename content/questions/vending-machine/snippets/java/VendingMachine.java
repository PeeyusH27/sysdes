import java.util.*;
import java.util.concurrent.*;

record Pending(String code, int price, List<Integer> change) {}

// Observer: the display, telemetry, persistence and tests listen.
interface VendingListener {
    default void transition(State from, State to, EventType event) {}
    default void returned(List<Integer> coins, String why) {}  // coins drop to the cup
    default void rejected(EventType event, State state, String reason) {}
    default void sale(String code, int price) {}
}

final class VendingMachine {
    private final Inventory inventory;
    private final CoinBox box;
    private State state = State.IDLE;
    // The customer's coins: not the machine's money until the sale commits
    private List<Integer> escrow = new ArrayList<>();
    private Pending pending;  // between "motor on" and the drop sensor, else null
    private final Deque<Event> queue = new ArrayDeque<>();
    private boolean draining;
    private final List<VendingListener> listeners = new CopyOnWriteArrayList<>();

    VendingMachine(List<Slot> slots, Map<Integer, Integer> coins) {
        this.inventory = new Inventory(slots);
        this.box = new CoinBox(coins);
    }

    void addListener(VendingListener l) { listeners.add(l); }

    synchronized State state() { return state; }
    synchronized int credit() { return Coins.sum(escrow); }
    synchronized List<Integer> escrow() { return List.copyOf(escrow); }
    synchronized Optional<Pending> pending() { return Optional.ofNullable(pending); }
    Inventory inventory() { return inventory; }
    CoinBox box() { return box; }

    // Every input (coin mech, keypad, drop sensor, service key) is one event on one queue, handled in
    // order. In a real machine they are separate threads, so send() is synchronized: the monitor plays
    // the part of Node's single thread. It is reentrant, so a listener that sends mid-transition only
    // queues its event, which runs next, not inside the transition. Empty means "queued".
    synchronized Optional<Result> send(Event event) {
        queue.add(event);
        if (draining) return Optional.empty();
        draining = true;
        Result first = null;
        try {
            while (!queue.isEmpty()) {
                Result result = handle(queue.poll());
                if (first == null) first = result;
            }
        } finally {
            draining = false;
        }
        return Optional.of(first);
    }

    private Result handle(Event event) {
        State from = state;
        if (event.type() == EventType.COIN && !Coins.ACCEPTED.contains(event.coin())) {
            return reject(event, "coin not accepted");
        }
        Handler handler = States.TABLE.get(from).get(event.type());
        if (handler == null) return reject(event, event.type() + " not allowed in " + from);
        Result next = handler.handle(this, event);
        if (!next.ok()) return reject(event, next.reason());
        state = next.state();
        listeners.forEach(l -> l.transition(from, next.state(), event.type()));
        return next;
    }

    private Result reject(Event event, String reason) {
        if (event.type() == EventType.COIN) {
            listeners.forEach(l -> l.returned(List.of(event.coin()), "refused"));  // straight to the cup
        }
        listeners.forEach(l -> l.rejected(event.type(), state, reason));
        return Result.rejected(reason);
    }

    // ---- called by the state table, always inside send()
    void insert(int coin) { escrow.add(coin); }

    void reserve(Pending p) { pending = p; }

    void refund(String why) {
        List<Integer> coins = escrow;
        escrow = new ArrayList<>();
        listeners.forEach(l -> l.returned(coins, why));  // the same coins the customer inserted
    }

    void abandon(String why) {  // the item never fell
        pending = null;
        refund(why);
    }

    void commit() {
        Pending p = pending;
        box.add(escrow);  // the escrow becomes the machine's money...
        box.remove(p.change());  // ...and the reserved change leaves
        escrow = new ArrayList<>();
        pending = null;
        inventory.take(p.code());  // exactly once per sale
        listeners.forEach(l -> l.returned(p.change(), "change"));
        listeners.forEach(l -> l.sale(p.code(), p.price()));
    }
}
