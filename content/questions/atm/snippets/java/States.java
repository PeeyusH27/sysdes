import java.util.*;

interface Handler {
    Result handle(Atm atm, Event event);
}

// The State pattern as a table: each state lists the events it accepts and returns the next state.
// An event a state does not list is rejected and changes nothing, so every (state, event) pair has one outcome.
final class States {
    static final Map<State, Map<EventType, Handler>> TABLE = new EnumMap<>(State.class);

    static {
        TABLE.put(State.IDLE, Map.of(EventType.INSERT_CARD, States::insertCard));
        TABLE.put(State.CARD_IN, Map.of(EventType.ENTER_PIN, States::enterPin, EventType.EJECT, States::eject));
        TABLE.put(State.AUTHENTICATED, Map.of(
                EventType.BALANCE, States::balance, EventType.WITHDRAW, States::withdraw, EventType.EJECT, States::eject));
    }

    private static Result insertCard(Atm atm, Event e) {
        Account account = atm.accounts().get(e.text());
        if (account == null) return Result.rejected("unknown card");
        if (account.locked()) return Result.rejected("card retained: account locked");
        atm.setCard(account);
        return Result.to(State.CARD_IN);
    }

    private static Result enterPin(Atm atm, Event e) {
        Account card = atm.card();
        switch (card.tryPin(e.text())) {
            case OK:
                return Result.to(State.AUTHENTICATED).withPin(true, 0, false);
            case LOCKED:
                atm.setCard(null);
                return Result.to(State.IDLE).withPin(false, 0, true);
            default:
                return Result.to(State.CARD_IN).withPin(false, card.attemptsLeft(), false);
        }
    }

    private static Result balance(Atm atm, Event e) {
        return Result.to(State.AUTHENTICATED).withCash(Map.of(), atm.card().balance());
    }

    private static Result withdraw(Atm atm, Event e) {
        int amount = e.amount();
        if (amount <= 0 || amount % atm.unit() != 0) return Result.rejected("invalid amount");
        Optional<Map<Integer, Integer>> plan = atm.chain().plan(amount, atm.stock());  // plan first: no plan, no debit
        if (plan.isEmpty()) return Result.rejected("cannot dispense that amount");
        Account card = atm.card();
        if (!card.debit(amount)) return Result.rejected("insufficient funds");
        if (!atm.hardware().dispense(plan.get())) {
            card.credit(amount);
            return Result.rejected("dispenser jam: nothing charged");
        }
        plan.get().forEach((note, n) -> atm.stock().merge(note, -n, Integer::sum));
        return Result.to(State.AUTHENTICATED).withCash(plan.get(), card.balance());
    }

    private static Result eject(Atm atm, Event e) {
        atm.setCard(null);
        return Result.to(State.IDLE);
    }

    private States() {}
}
