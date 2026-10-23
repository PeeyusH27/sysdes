import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

// One Atm is one user at a time, so the Atm itself is not shared between threads. What IS shared between
// machines is the Account, and its methods are synchronized.
final class Atm {
    private final Map<String, Account> accounts = new HashMap<>();
    private final Map<Integer, Integer> stock;
    private final NoteHandler chain;
    private final int unit;
    private final Hardware hardware;
    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();
    private State state = State.IDLE;
    private Account card;

    Atm(List<Account> accounts, Map<Integer, Integer> stock, List<Integer> notes, Hardware hardware) {
        for (Account a : accounts) this.accounts.put(a.id(), a);
        this.stock = new HashMap<>(stock);
        this.chain = NoteHandler.chain(notes);
        this.unit = Collections.min(notes);
        this.hardware = hardware;
    }

    Atm(List<Account> accounts, Map<Integer, Integer> stock) {
        this(accounts, stock, List.of(100, 50, 20, 10), notes -> true);
    }

    void onEvent(Consumer<String> listener) { listeners.add(listener); }  // observer: audit log, receipts, alerts

    Map<String, Account> accounts() { return accounts; }
    Map<Integer, Integer> stock() { return stock; }
    NoteHandler chain() { return chain; }
    int unit() { return unit; }
    Hardware hardware() { return hardware; }
    Account card() { return card; }
    void setCard(Account card) { this.card = card; }
    State state() { return state; }

    Result insertCard(String id) { return send(new Event(EventType.INSERT_CARD, id, 0)); }
    Result enterPin(String pin) { return send(new Event(EventType.ENTER_PIN, pin, 0)); }
    Result withdraw(int amount) { return send(new Event(EventType.WITHDRAW, "", amount)); }
    Result balance() { return send(Event.of(EventType.BALANCE)); }
    Result eject() { return send(Event.of(EventType.EJECT)); }

    Result send(Event event) {
        Handler handler = States.TABLE.get(state).get(event.type());
        if (handler == null) return reject(event, event.type() + " not allowed in " + state);
        Result result = handler.handle(this, event);
        if (!result.ok()) return reject(event, result.reason());
        state = result.state();
        listeners.forEach(l -> l.accept(event.type() + ":true"));
        return result;
    }

    private Result reject(Event event, String reason) {
        listeners.forEach(l -> l.accept(event.type() + ":false"));
        return Result.rejected(reason);
    }
}
