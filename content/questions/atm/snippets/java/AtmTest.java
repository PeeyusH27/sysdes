import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/atm *.java && java -cp /tmp/atm AtmTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class AtmTest {
    public static void main(String[] args) {
        test("a normal session: card, PIN, withdraw 130, eject", AtmTest::session);
        test("every event a state does not list is rejected and changes nothing", AtmTest::unlisted);
        test("three wrong PINs lock the account and keep the card", AtmTest::lockout);
        test("a correct PIN resets the failure count", AtmTest::pinReset);
        test("insufficient funds: rejected, nothing debited, no notes leave", AtmTest::insufficient);
        test("limited notes: greedy would strand 10, the chain backtracks", AtmTest::backtracks);
        test("an amount the notes cannot make is rejected before any debit", AtmTest::cannotMake);
        test("zero, negative and off-unit amounts are invalid", AtmTest::invalidAmounts);
        test("a jammed cash unit refunds the debit and keeps the stock", AtmTest::jam);
        test("a new note value is one more handler in the list", AtmTest::newNote);
        test("listeners see accepted and rejected events", AtmTest::listeners);
        test("8 machines, one account with 50: exactly five 10s get out", AtmTest::concurrent);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static final Map<Integer, Integer> FULL = Map.of(100, 5, 50, 5, 20, 5, 10, 5);

    static Atm make(Map<Integer, Integer> stock) {
        return new Atm(List.of(new Account("ann", "1234", 500), new Account("bob", "9999", 40)), stock);
    }

    static Atm login(Atm atm, String id, String pin) {
        atm.insertCard(id);
        atm.enterPin(pin);
        return atm;
    }

    static Atm login(Atm atm) { return login(atm, "ann", "1234"); }

    static String snapshot(Atm atm) {
        return atm.state() + "|" + (atm.card() == null ? "-" : atm.card().id()) + "|" + new TreeMap<>(atm.stock())
                + "|" + atm.accounts().get("ann").balance() + "|" + atm.accounts().get("bob").balance();
    }

    static void session() {
        Atm atm = login(make(FULL));
        Result r = atm.withdraw(130);
        check(r.ok() && r.notes().equals(Map.of(100, 1, 20, 1, 10, 1)) && r.balance() == 370, r.toString());
        check(new TreeMap<>(atm.stock()).toString().equals("{10=4, 20=4, 50=5, 100=4}"), atm.stock().toString());
        check(atm.eject().state() == State.IDLE, "back to idle");
    }

    static void unlisted() {
        for (State state : State.values()) {
            for (EventType type : EventType.values()) {
                if (States.TABLE.get(state).containsKey(type)) continue;
                Atm atm = make(FULL);
                if (state != State.IDLE) atm.insertCard("ann");
                if (state == State.AUTHENTICATED) atm.enterPin("1234");
                String before = snapshot(atm);
                Result r = atm.send(new Event(type, "ann", 10));
                check(!r.ok(), state + "." + type + " should be rejected");
                check(snapshot(atm).equals(before), state + "." + type + " changed something");
            }
        }
    }

    static void lockout() {
        Atm atm = make(FULL);
        atm.insertCard("ann");
        Result first = atm.enterPin("0000");
        check(first.ok() && !first.authenticated() && first.attemptsLeft() == 2, "2 left");
        check(atm.enterPin("0001").attemptsLeft() == 1, "1 left");
        Result third = atm.enterPin("0002");
        check(!third.authenticated() && third.retained() && third.state() == State.IDLE, "card retained");
        check(atm.insertCard("ann").reason().equals("card retained: account locked"), "locked");
        check(atm.insertCard("bob").ok(), "other cards are unaffected");
    }

    static void pinReset() {
        Atm atm = make(FULL);
        atm.insertCard("ann");
        atm.enterPin("0000");
        atm.enterPin("1234");
        atm.eject();
        atm.insertCard("ann");
        check(atm.enterPin("0000").attemptsLeft() == 2, "count restarted");
    }

    static void insufficient() {
        Atm atm = login(make(FULL), "bob", "9999");
        String before = snapshot(atm);
        Result r = atm.withdraw(50);
        check(!r.ok() && r.reason().equals("insufficient funds"), r.reason());
        check(snapshot(atm).equals(before), "nothing changed");
    }

    static void backtracks() {
        Map<Integer, Integer> stock = Map.of(100, 0, 50, 1, 20, 3, 10, 0);
        Optional<Map<Integer, Integer>> plan = NoteHandler.chain(List.of(100, 50, 20, 10)).plan(60, stock);
        check(plan.isPresent() && plan.get().equals(Map.of(20, 3)), "three 20s");
        check(login(make(stock)).withdraw(60).notes().equals(Map.of(20, 3)), "through the ATM too");
    }

    static void cannotMake() {
        Atm atm = login(make(Map.of(100, 0, 50, 3, 20, 0, 10, 0)));
        Result r = atm.withdraw(70);
        check(!r.ok() && r.reason().equals("cannot dispense that amount"), r.reason());
        check(atm.balance().balance() == 500, "no debit");
    }

    static void invalidAmounts() {
        Atm atm = login(make(FULL));
        for (int amount : new int[] {0, -20, 15, 7}) {
            check(atm.withdraw(amount).reason().equals("invalid amount"), "amount " + amount);
        }
        check(atm.balance().balance() == 500, "no debit");
    }

    static void jam() {
        Atm atm = new Atm(List.of(new Account("ann", "1234", 500)), FULL, List.of(100, 50, 20, 10), notes -> false);
        login(atm);
        Result r = atm.withdraw(100);
        check(!r.ok() && r.reason().equals("dispenser jam: nothing charged"), r.reason());
        check(atm.balance().balance() == 500 && atm.stock().get(100) == 5, "refunded, stock kept");
    }

    static void newNote() {
        Atm atm = new Atm(List.of(new Account("ann", "1234", 500)), Map.of(200, 2), List.of(200, 100, 50, 20, 10), notes -> true);
        login(atm);
        check(atm.withdraw(400).notes().equals(Map.of(200, 2)), "two 200s");
    }

    static void listeners() {
        Atm atm = make(FULL);
        List<String> seen = new ArrayList<>();
        atm.onEvent(seen::add);
        atm.withdraw(10);
        atm.insertCard("ann");
        check(seen.equals(List.of("WITHDRAW:false", "INSERT_CARD:true")), seen.toString());
    }

    static void concurrent() {
        Account shared = new Account("ann", "1234", 50);
        AtomicInteger paid = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> done = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            done.add(pool.submit(() -> {
                Atm atm = new Atm(List.of(shared), Map.of(10, 100));  // each machine has its own cash
                login(atm);
                for (int k = 0; k < 3; k++) if (atm.withdraw(10).ok()) paid.incrementAndGet();
            }));
        }
        try {
            for (Future<?> f : done) f.get(30, TimeUnit.SECONDS);
        } catch (Exception e) {
            throw new AssertionError(e);
        } finally {
            pool.shutdownNow();
        }
        check(paid.get() == 5 && shared.balance() == 0, "paid " + paid.get() + ", balance " + shared.balance());
    }

    // ---- a tiny test harness
    interface Body { void run() throws Exception; }

    private static int failed = 0;

    static void test(String name, Body body) {
        try {
            body.run();
            System.out.println("PASS  " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL  " + name + "\n      " + e);
        }
    }

    static void check(boolean ok, String what) {
        if (!ok) throw new AssertionError(what);
    }
}
