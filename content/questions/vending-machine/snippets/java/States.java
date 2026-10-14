import java.util.*;

enum State { IDLE, HAS_MONEY, DISPENSING, OUT_OF_SERVICE }

enum EventType { COIN, SELECT, CANCEL, DROPPED, DROP_FAILED, SERVICE, RESTOCK, REFILL }

// One input from the coin mech, keypad, drop sensor or service key. Unused fields stay empty.
record Event(EventType type, int coin, String code, int n, List<Integer> coins) {
    static Event coin(int cents) { return new Event(EventType.COIN, cents, null, 0, List.of()); }
    static Event select(String code) { return new Event(EventType.SELECT, 0, code, 0, List.of()); }
    static Event restock(String code, int n) { return new Event(EventType.RESTOCK, 0, code, n, List.of()); }
    static Event refill(List<Integer> coins) {
        return new Event(EventType.REFILL, 0, null, 0, List.copyOf(coins));
    }
    static Event of(EventType type) { return new Event(type, 0, null, 0, List.of()); }  // cancel, dropped…
}

// A handler's answer, and send()'s: the next state, or why the event was rejected.
record Result(boolean ok, State state, String reason) {
    static Result to(State next) { return new Result(true, next, null); }
    static Result rejected(String reason) { return new Result(false, null, reason); }
}

interface Handler { Result handle(VendingMachine m, Event e); }

// The State pattern as a table: each state lists the events it accepts and returns the next state.
// An event a state doesn't list is rejected and changes nothing, so every (state, event) pair has one outcome.
final class States {
    static final Map<State, Map<EventType, Handler>> TABLE = new EnumMap<>(State.class);

    static {
        Handler insert = (m, e) -> { m.insert(e.coin()); return Result.to(State.HAS_MONEY); };
        Handler restock = (m, e) -> { m.inventory().restock(e.code(), e.n()); return Result.to(m.state()); };
        Handler refill = (m, e) -> { m.box().add(e.coins()); return Result.to(m.state()); };
        TABLE.put(State.IDLE, Map.of(
                EventType.COIN, insert,
                EventType.SERVICE, (m, e) -> Result.to(State.OUT_OF_SERVICE),
                EventType.RESTOCK, restock,
                EventType.REFILL, refill));
        TABLE.put(State.HAS_MONEY, Map.of(
                EventType.COIN, insert,
                EventType.SELECT, States::select,
                EventType.CANCEL, (m, e) -> { m.refund("cancelled"); return Result.to(State.IDLE); },
                EventType.SERVICE, (m, e) -> {
                    m.refund("out of service");
                    return Result.to(State.OUT_OF_SERVICE);
                }));
        TABLE.put(State.DISPENSING, Map.of(
                // the drop sensor saw the item fall, or it didn't
                EventType.DROPPED, (m, e) -> { m.commit(); return Result.to(State.IDLE); },
                EventType.DROP_FAILED, (m, e) -> {
                    m.abandon("nothing dropped");
                    return Result.to(State.IDLE);
                }));
        TABLE.put(State.OUT_OF_SERVICE, Map.of(
                EventType.SERVICE, (m, e) -> Result.to(State.IDLE),
                EventType.RESTOCK, restock,
                EventType.REFILL, refill));
    }

    static boolean accepts(State state, EventType type) { return TABLE.get(state).containsKey(type); }

    private static Result select(VendingMachine m, Event e) {
        Optional<Slot> found = m.inventory().get(e.code());
        if (found.isEmpty()) return Result.rejected("No slot " + e.code());
        Slot slot = found.get();
        // Sold out keeps the credit: pick another or cancel
        if (slot.soldOut()) return Result.rejected(e.code() + " is sold out");
        int credit = m.credit();
        if (credit < slot.price()) return Result.rejected("Insert " + (slot.price() - credit) + "¢ more");
        Optional<List<Integer>> change = Change.make(credit - slot.price(), m.box().with(m.escrow()));
        if (change.isEmpty()) {
            m.refund("exact change only");  // never sell without paying change
            return Result.to(State.IDLE);
        }
        m.reserve(new Pending(e.code(), slot.price(), change.get()));  // reserved: no coin or item moves yet
        return Result.to(State.DISPENSING);
    }

    private States() {}
}
