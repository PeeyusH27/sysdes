import java.util.*;
import java.util.concurrent.*;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/vend *.java && java -cp /tmp/vend VendingMachineTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class VendingMachineTest {
    public static void main(String[] args) {
        test("greedy fails with limited tubes; the bounded DP still finds change", VendingMachineTest::greedyVsDp);
        test("with plenty of coins, greedy is already optimal", VendingMachineTest::plenty);
        test("the DP returns the fewest coins and respects the tubes (brute force)", VendingMachineTest::bruteForce);
        test("a sale commits only after the drop sensor: 100¢ for a 65¢ cola", VendingMachineTest::sale);
        test("every event a state does not list is rejected and changes nothing", VendingMachineTest::unlisted);
        test("sold out and short credit keep the credit; cancel returns the coins", VendingMachineTest::keepCredit);
        test("no change possible: refuse the sale, refund everything, take no stock", VendingMachineTest::noChange);
        test("a failed drop refunds the escrow and takes no stock", VendingMachineTest::failedDrop);
        test("change may come from the coins just inserted", VendingMachineTest::changeFromEscrow);
        test("money is conserved and stock drops once per sale over 5,000 random events", VendingMachineTest::random);
        test("a listener that sends mid-transition is queued, not run inside it", VendingMachineTest::reentrant);
        test("8 coin threads at once: no coin is lost", VendingMachineTest::concurrentCoins);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static final Map<Integer, Integer> TUBES = Map.of(25, 10, 10, 10, 5, 10);  // 250 + 100 + 50 = 400¢

    // A machine plus everything its listeners saw
    static final class Rig implements VendingListener {
        final VendingMachine m;
        final List<Integer> returned = new ArrayList<>();
        final List<String> rejected = new ArrayList<>();
        final List<String> sales = new ArrayList<>();
        int paidOut;

        Rig(Map<Integer, Integer> coins) {
            m = new VendingMachine(List.of(new Slot("B2", "Cola", 65, 2), new Slot("C2", "Pretzels", 85, 0)), coins);
            m.addListener(this);
        }

        @Override public void returned(List<Integer> coins, String why) {
            returned.addAll(coins);
            if (!why.equals("refused")) paidOut += Coins.sum(coins);  // a refused coin never entered the machine
        }

        @Override public void rejected(EventType event, State state, String reason) { rejected.add(reason); }

        @Override public void sale(String code, int price) { sales.add(code); }

        int stock(String code) { return m.inventory().get(code).orElseThrow().count(); }

        int stock() { return stock("B2") + stock("C2"); }

        String snapshot() {
            return m.state() + " " + m.escrow() + " " + m.pending() + " " + m.box().counts() + " " + stock();
        }
    }

    static Rig make() { return new Rig(TUBES); }

    static void greedyVsDp() {
        Map<Integer, Integer> tubes = Map.of(100, 0, 25, 1, 10, 3, 5, 0);
        eq(Change.greedy(30, tubes), Optional.empty());  // takes the 25¢, then needs a 5¢
        eq(Change.make(30, tubes), Optional.of(List.of(10, 10, 10)));
        eq(Change.make(15, tubes), Optional.empty());  // truly impossible
        eq(Change.make(0, tubes), Optional.of(List.of()));
    }

    static void plenty() {
        Map<Integer, Integer> plenty = Map.of(100, 9, 25, 9, 10, 9, 5, 9);
        for (int a = 0; a <= 300; a += 5) {
            List<Integer> dp = Change.make(a, plenty).orElseThrow();
            eq(Coins.sum(dp), a);
            eq(dp.size(), Change.greedy(a, plenty).orElseThrow().size());
        }
    }

    static void bruteForce() {
        Map<Integer, Integer> tubes = Map.of(100, 1, 25, 2, 10, 4, 5, 3);  // 205¢ in total
        for (int a = 0; a <= 230; a += 5) {
            int fewest = Integer.MAX_VALUE;
            for (int h = 0; h <= 1; h++)
                for (int q = 0; q <= 2; q++)
                    for (int d = 0; d <= 4; d++)
                        for (int n = 0; n <= 3; n++)
                            if (100 * h + 25 * q + 10 * d + 5 * n == a) fewest = Math.min(fewest, h + q + d + n);
            Optional<List<Integer>> coins = Change.make(a, tubes);
            if (fewest == Integer.MAX_VALUE) {
                eq(coins, Optional.empty());
                continue;
            }
            eq(Coins.sum(coins.get()), a);
            eq(coins.get().size(), fewest);
            for (int c : Coins.ACCEPTED) {
                check(coins.get().stream().filter(x -> x == c).count() <= tubes.get(c), "tube " + c);
            }
        }
    }

    static void sale() {
        Rig r = make();
        r.m.send(Event.coin(100));
        eq(r.m.state(), State.HAS_MONEY);
        eq(r.m.send(Event.select("B2")), Optional.of(Result.to(State.DISPENSING)));
        eq(r.m.pending().orElseThrow().change(), List.of(25, 10));
        eq(r.stock("B2"), 2);  // nothing taken yet
        r.m.send(Event.of(EventType.DROPPED));
        eq(r.m.state(), State.IDLE);
        eq(r.returned, List.of(25, 10));
        eq(r.sales, List.of("B2"));
        eq(r.stock("B2"), 1);
        eq(r.m.box().total(), 400 + 100 - 35);
    }

    static void unlisted() {
        List<Event> events = List.of(Event.coin(25), Event.select("B2"), Event.of(EventType.CANCEL),
                Event.of(EventType.DROPPED), Event.of(EventType.DROP_FAILED), Event.of(EventType.SERVICE),
                Event.restock("B2", 1), Event.refill(List.of(5)));
        Map<State, List<Event>> reach = Map.of(
                State.IDLE, List.of(),
                State.HAS_MONEY, List.of(Event.coin(25)),
                State.DISPENSING, List.of(Event.coin(100), Event.select("B2")),
                State.OUT_OF_SERVICE, List.of(Event.of(EventType.SERVICE)));
        int checked = 0;
        for (State state : State.values()) {
            for (Event e : events) {
                if (States.accepts(state, e.type())) continue;
                Rig r = make();
                reach.get(state).forEach(r.m::send);
                eq(r.m.state(), state);
                String before = r.snapshot();
                eq(r.m.send(e).orElseThrow().ok(), false);
                eq(r.snapshot(), before);
                if (e.type() == EventType.COIN) eq(r.returned.get(r.returned.size() - 1), 25);  // refused: to the cup
                checked++;
            }
        }
        eq(checked, 19);  // 32 pairs, 13 accepted
    }

    static void keepCredit() {
        Rig r = make();
        r.m.send(Event.coin(25));
        r.m.send(Event.coin(25));
        eq(r.m.send(Event.select("C2")), Optional.of(Result.rejected("C2 is sold out")));
        eq(r.m.send(Event.select("B2")), Optional.of(Result.rejected("Insert 15¢ more")));
        eq(r.m.credit(), 50);
        r.m.send(Event.of(EventType.CANCEL));
        eq(r.m.state(), State.IDLE);
        eq(r.returned, List.of(25, 25));
    }

    static void noChange() {
        Rig r = new Rig(Map.of(25, 4));  // only quarters: 35¢ can't be paid
        r.m.send(Event.coin(100));
        eq(r.m.send(Event.select("B2")), Optional.of(Result.to(State.IDLE)));
        eq(r.returned, List.of(100));
        eq(r.sales, List.of());
        eq(r.stock("B2"), 2);
        eq(r.m.box().total(), 100);
    }

    static void failedDrop() {
        Rig r = make();
        r.m.send(Event.coin(100));
        r.m.send(Event.select("B2"));
        r.m.send(Event.of(EventType.DROP_FAILED));
        eq(r.m.state(), State.IDLE);
        eq(r.returned, List.of(100));
        eq(r.stock("B2"), 2);
        eq(r.m.box().total(), 400);
    }

    static void changeFromEscrow() {
        Rig r = new Rig(Map.of());  // empty tubes
        for (int c : List.of(25, 25, 10, 10, 5)) r.m.send(Event.coin(c));  // 75¢ for a 65¢ cola
        eq(r.m.send(Event.select("B2")), Optional.of(Result.to(State.DISPENSING)));
        eq(r.m.pending().orElseThrow().change(), List.of(10));  // a 10¢ the customer just inserted
    }

    static void random() {
        Mulberry32 rand = new Mulberry32(7);
        Rig r = new Rig(Map.of(25, 2, 10, 2, 5, 1));
        int opening = r.m.box().total();
        int inserted = 0;
        int refilled = 0;
        int restocked = 0;
        for (int i = 0; i < 5000; i++) {
            List<Event> options = List.of(  // built first, in the JS order, so the
                    Event.coin(pick(rand, 100, 25, 10, 5, 1)), Event.coin(pick(rand, 25, 10)),  // same seed
                    Event.select(pick(rand, "B2", "C2")), Event.of(EventType.CANCEL),  // replays the
                    Event.of(EventType.DROPPED), Event.of(EventType.DROP_FAILED),  // same events
                    Event.of(EventType.SERVICE), Event.restock(pick(rand, "B2", "C2"), 2),
                    Event.refill(List.of(5, 10)));
            Event e = options.get((int) Math.floor(rand.next() * options.size()));
            int before = r.stock();
            boolean ok = r.m.send(e).orElseThrow().ok();
            if (ok && e.type() == EventType.COIN) inserted += e.coin();
            if (ok && e.type() == EventType.REFILL) refilled += Coins.sum(e.coins());
            if (ok && e.type() == EventType.RESTOCK) restocked += r.stock() - before;
            eq(r.m.credit() + r.m.box().total() + r.paidOut, opening + inserted + refilled);
            eq(r.stock(), 2 + restocked - r.sales.size());
            check(r.m.box().counts().values().stream().allMatch(n -> n >= 0), "no tube below zero");
        }
        eq(r.sales.size(), 7);  // the same 7 sales as the JS run
    }

    static void reentrant() {
        Rig r = make();
        r.m.addListener(new VendingListener() {  // an instant drop sensor
            @Override public void transition(State from, State to, EventType event) {
                if (to == State.DISPENSING) r.m.send(Event.of(EventType.DROPPED));
            }
        });
        r.m.send(Event.coin(100));
        eq(r.m.send(Event.select("B2")), Optional.of(Result.to(State.DISPENSING)));
        eq(r.m.state(), State.IDLE);  // dropped ran right after, not inside
        eq(r.sales, List.of("B2"));
    }

    static void concurrentCoins() throws Exception {
        Rig r = make();
        CountDownLatch go = new CountDownLatch(1);
        List<Thread> slots = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            Thread th = new Thread(() -> {
                try {
                    go.await();
                } catch (InterruptedException e) {
                    return;
                }
                for (int i = 0; i < 100; i++) r.m.send(Event.coin(5));
            });
            slots.add(th);
            th.start();
        }
        go.countDown();
        for (Thread th : slots) th.join();
        eq(r.m.credit(), 8 * 100 * 5);
        r.m.send(Event.of(EventType.CANCEL));
        eq(r.paidOut, 4000);
    }

    // mulberry32, the same generator as the JS test
    static final class Mulberry32 {
        private int seed;

        Mulberry32(int seed) { this.seed = seed; }

        double next() {
            seed += 0x6D2B79F5;
            int t = (seed ^ (seed >>> 15)) * (1 | seed);
            t = (t + (t ^ (t >>> 7)) * (61 | t)) ^ t;
            return ((t ^ (t >>> 14)) & 0xFFFFFFFFL) / 4294967296.0;
        }
    }

    @SafeVarargs
    static <T> T pick(Mulberry32 rand, T... xs) { return xs[(int) Math.floor(rand.next() * xs.length)]; }

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

    static void eq(Object actual, Object expected) {
        if (!Objects.equals(actual, expected)) throw new AssertionError("expected " + expected + ", got " + actual);
    }
}
