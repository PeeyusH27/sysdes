import java.util.*;

// Money is whole dollars in an int, never a double. (One javac call compiles the folder, so these small
// package-private types share a file; in a real codebase each gets its own.)
enum PinResult { OK, WRONG, LOCKED }

enum State { IDLE, CARD_IN, AUTHENTICATED }

enum EventType { INSERT_CARD, ENTER_PIN, WITHDRAW, BALANCE, EJECT }

record Event(EventType type, String text, int amount) {
    static Event of(EventType type) { return new Event(type, "", 0); }
}

// The cash unit is injected, so a test can make it jam.
interface Hardware {
    boolean dispense(Map<Integer, Integer> notes);
}

record Result(boolean ok, State state, String reason, Map<Integer, Integer> notes, int balance,
              int attemptsLeft, boolean authenticated, boolean retained) {
    static Result rejected(String reason) { return new Result(false, null, reason, Map.of(), 0, 0, false, false); }
    static Result to(State state) { return new Result(true, state, "", Map.of(), 0, 0, false, false); }

    Result withCash(Map<Integer, Integer> notes, int balance) {
        return new Result(ok, state, reason, notes, balance, attemptsLeft, authenticated, retained);
    }

    Result withPin(boolean authenticated, int attemptsLeft, boolean retained) {
        return new Result(ok, state, reason, notes, balance, attemptsLeft, authenticated, retained);
    }
}

final class Account {
    static final int MAX_PIN_TRIES = 3;

    private final String id;
    private final String pin;
    private int balance;
    private int failedPins;  // lives on the account, so two machines share one count
    private boolean locked;

    Account(String id, String pin, int balance) {
        this.id = id;
        this.pin = pin;
        this.balance = balance;
    }

    String id() { return id; }
    synchronized int balance() { return balance; }
    synchronized boolean locked() { return locked; }
    synchronized int attemptsLeft() { return MAX_PIN_TRIES - failedPins; }

    synchronized PinResult tryPin(String attempt) {
        if (locked) return PinResult.LOCKED;
        if (pin.equals(attempt)) {
            failedPins = 0;
            return PinResult.OK;
        }
        if (++failedPins >= MAX_PIN_TRIES) {
            locked = true;
            return PinResult.LOCKED;
        }
        return PinResult.WRONG;
    }

    // Check and subtract in one locked step: two machines cannot both spend the last 50.
    synchronized boolean debit(int amount) {
        if (balance < amount) return false;
        balance -= amount;
        return true;
    }

    synchronized void credit(int amount) { balance += amount; }  // also the undo for a debit when the cash jams
}
