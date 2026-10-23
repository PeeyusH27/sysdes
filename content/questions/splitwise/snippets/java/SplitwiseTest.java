import java.util.*;
import java.util.concurrent.*;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/split *.java && java -cp /tmp/split SplitwiseTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class SplitwiseTest {
    public static void main(String[] args) {
        test("an equal split: the payer is owed everyone else's share", SplitwiseTest::equalSplit);
        test("leftover cents go to the first participants, one each, in the order given", SplitwiseTest::remainder);
        test("exact: shares must add up to the amount", SplitwiseTest::exact);
        test("percent: whole percents that add to 100, with the remainder rule", SplitwiseTest::percent);
        test("shares: proportional to the weights", SplitwiseTest::shares);
        test("every split hands out exactly the amount, for 500 random bills", SplitwiseTest::randomBills);
        test("bad expenses are rejected and change nothing", SplitwiseTest::badExpenses);
        test("debts between a pair are netted both ways", SplitwiseTest::netted);
        test("repeated expenses between the same pair add up", SplitwiseTest::repeated);
        test("settling reduces the debt, and never more than is owed", SplitwiseTest::settling);
        test("simplify: A owes B and B owes C becomes A pays C", SplitwiseTest::chain);
        test("simplify: ties break by name", SplitwiseTest::ties);
        test("simplify: a messy trip settles to zero in at most n - 1 transfers", SplitwiseTest::messy);
        test("listeners hear about expenses and settlements", SplitwiseTest::listeners);
        test("8 threads settle the same 500 debt in 100s: exactly five succeed", SplitwiseTest::settleRace);
        test("8 threads add 800 expenses: the books still add up to zero", SplitwiseTest::expenseRace);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static Group trip() { return new Group(List.of("ana", "ben", "cam", "dee")); }

    static List<Long> longs(long... xs) {
        List<Long> out = new ArrayList<>();
        for (long x : xs) out.add(x);
        return out;
    }

    static List<Long> split(String type, long amount, List<String> users, List<Long> data) {
        return Splits.BY_TYPE.get(type).split(amount, users, data).orElse(null);
    }

    static void equalSplit() {
        Group g = trip();
        Result r = g.addExpense("ana", 3000, "equal", List.of("ana", "ben", "cam"));
        check(r.shares().equals(Map.of("ana", 1000L, "ben", 1000L, "cam", 1000L)), r.toString());
        check(g.owes("ben", "ana") == 1000 && g.owes("ana", "ben") == 0, "ben owes ana 1000");
        check(g.balances().equals(Map.of("ben", -1000L, "ana", 2000L, "cam", -1000L)), g.balances().toString());
    }

    static void remainder() {
        List<String> abc = List.of("a", "b", "c");
        check(split("equal", 1000, abc, List.of()).equals(longs(334, 333, 333)), "1000");
        check(split("equal", 1001, abc, List.of()).equals(longs(334, 334, 333)), "1001");
        check(split("equal", 1001, List.of("c", "a", "b"), List.of()).equals(longs(334, 334, 333)), "order given");
    }

    static void exact() {
        List<String> ab = List.of("a", "b");
        check(split("exact", 2000, ab, longs(500, 1500)).equals(longs(500, 1500)), "valid");
        check(split("exact", 2000, ab, longs(500, 1400)) == null, "sum short");
        check(split("exact", 2000, ab, longs(-100, 2100)) == null, "negative share");
    }

    static void percent() {
        check(split("percent", 1001, List.of("a", "b", "c"), longs(50, 30, 20)).equals(longs(501, 300, 200)), "501/300/200");
        check(split("percent", 1001, List.of("a", "b"), longs(50, 40)) == null, "90 percent");
        check(split("percent", 1000, List.of("a", "b"), longs(100, 0)) == null, "zero percent");
    }

    static void shares() {
        check(split("shares", 1001, List.of("a", "b", "c"), longs(2, 1, 1)).equals(longs(501, 250, 250)), "2:1:1");
        check(split("shares", 1000, List.of("a", "b"), longs(1, 0)) == null, "zero weight");
    }

    static void randomBills() {
        Random rnd = new Random(11);
        for (int i = 0; i < 500; i++) {
            int n = 1 + rnd.nextInt(6);
            long amount = 1 + rnd.nextInt(100000);
            List<String> users = new ArrayList<>();
            List<Long> weights = new ArrayList<>();
            for (int k = 0; k < n; k++) {
                users.add("u" + k);
                weights.add(1L + rnd.nextInt(5));
            }
            check(Splits.sum(split("equal", amount, users, List.of())) == amount, "equal " + i);
            check(Splits.sum(split("shares", amount, users, weights)) == amount, "shares " + i);
        }
    }

    static void badExpenses() {
        Group g = trip();
        check(!g.addExpense("zed", 100, "equal", List.of("ana")).ok(), "unknown payer");
        check(!g.addExpense("ana", 100, "equal", List.of("ana", "zed")).ok(), "unknown participant");
        check(!g.addExpense("ana", 100, "equal", List.of("ana", "ana")).ok(), "duplicate participant");
        check(!g.addExpense("ana", 100, "equal", List.of()).ok(), "nobody");
        check(!g.addExpense("ana", 0, "equal", List.of("ana")).ok(), "zero amount");
        check(!g.addExpense("ana", 100, "weird", List.of("ana")).ok(), "unknown type");
        check(!g.addExpense("ana", 100, "exact", List.of("ana", "ben"), longs(50, 49)).ok(), "exact sum off");
        check(g.expenseCount() == 0 && g.balances().isEmpty(), "nothing recorded");
    }

    static void netted() {
        Group g = trip();
        g.addExpense("ana", 1000, "equal", List.of("ana", "ben"));  // ben owes ana 500
        g.addExpense("ben", 300, "equal", List.of("ana", "ben"));   // ana owes ben 150
        check(g.owes("ben", "ana") == 350 && g.owes("ana", "ben") == 0, "350 one way");
    }

    static void repeated() {
        Group g = trip();
        for (int i = 0; i < 3; i++) g.addExpense("ana", 1000, "equal", List.of("ana", "ben"));
        check(g.owes("ben", "ana") == 1500, "1500");
        g.addExpense("ben", 4000, "equal", List.of("ana", "ben"));  // ana owes ben 2000, which cancels 1500
        check(g.owes("ana", "ben") == 500 && g.owes("ben", "ana") == 0, "500 the other way");
    }

    static void settling() {
        Group g = trip();
        g.addExpense("ana", 1000, "equal", List.of("ana", "ben"));
        check(g.settleUp("ben", "ana", 200).ok() && g.owes("ben", "ana") == 300, "300 left");
        check(!g.settleUp("ben", "ana", 400).ok(), "would overpay");
        check(!g.settleUp("ana", "ben", 1).ok(), "ana owes nothing");
        check(g.settleUp("ben", "ana", 300).ok(), "settled");
        check(g.balances().equals(Map.of("ben", 0L, "ana", 0L)), g.balances().toString());
    }

    static void chain() {
        Group g = trip();
        g.addExpense("ben", 1000, "exact", List.of("ana"), longs(1000));  // ana owes ben 1000
        g.addExpense("cam", 1000, "exact", List.of("ben"), longs(1000));  // ben owes cam 1000
        check(g.simplify().equals(List.of(new Transfer("ana", "cam", 1000))), g.simplify().toString());
    }

    static void ties() {
        Group g = trip();
        g.addExpense("dee", 4000, "equal", List.of("ana", "ben", "cam", "dee"));
        check(g.simplify().equals(List.of(new Transfer("ana", "dee", 1000), new Transfer("ben", "dee", 1000), new Transfer("cam", "dee", 1000))),
                g.simplify().toString());
    }

    static void messy() {
        Group g = new Group(List.of("ana", "ben", "cam", "dee", "eve"));
        g.addExpense("ana", 4500, "equal", List.of("ana", "ben", "cam"));
        g.addExpense("ben", 1200, "exact", List.of("cam", "dee"), longs(700, 500));
        g.addExpense("cam", 3333, "percent", List.of("ana", "ben", "cam", "dee"), longs(10, 20, 30, 40));
        g.addExpense("eve", 999, "equal", List.of("ana", "ben", "cam", "dee", "eve"));
        Map<String, Long> net = new TreeMap<>(g.balances());
        check(net.values().stream().mapToLong(Long::longValue).sum() == 0, "books add up");
        List<Transfer> plan = g.simplify();
        for (Transfer t : plan) {
            net.merge(t.from(), t.cents(), Long::sum);
            net.merge(t.to(), -t.cents(), Long::sum);
        }
        check(net.values().stream().allMatch(v -> v == 0), net.toString());
        check(plan.size() <= 4, "at most n - 1 transfers: " + plan.size());
    }

    static void listeners() {
        Group g = trip();
        List<String> seen = new ArrayList<>();
        g.onEvent(seen::add);
        g.addExpense("ana", 100, "equal", List.of("ana", "ben"));
        g.addExpense("ana", 0, "equal", List.of("ana"));
        g.settleUp("ben", "ana", 50);
        check(seen.equals(List.of("expense", "settled")), seen.toString());
    }

    static void settleRace() {
        Group g = trip();
        g.addExpense("ana", 1000, "equal", List.of("ana", "ben"));  // ben owes ana 500
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < 8; i++) results.add(pool.submit(() -> g.settleUp("ben", "ana", 100).ok()));
        int paid = 0;
        try {
            for (Future<Boolean> f : results) if (f.get(30, TimeUnit.SECONDS)) paid++;
        } catch (Exception e) {
            throw new AssertionError(e);
        } finally {
            pool.shutdownNow();
        }
        check(paid == 5 && g.owes("ben", "ana") == 0, "paid " + paid);
    }

    static void expenseRace() {
        Group g = new Group(List.of("ana", "ben", "cam"));
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> done = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            done.add(pool.submit(() -> {
                for (int i = 0; i < 100; i++) g.addExpense("ana", 1001, "equal", List.of("ana", "ben", "cam"));
            }));
        }
        try {
            for (Future<?> f : done) f.get(30, TimeUnit.SECONDS);
        } catch (Exception e) {
            throw new AssertionError(e);
        } finally {
            pool.shutdownNow();
        }
        Map<String, Long> net = g.balances();
        check(g.expenseCount() == 800, "800 expenses");
        check(net.get("ben") == -800 * 334L && net.get("cam") == -800 * 333L, net.toString());  // ben is second in the order, so he pays the extra cent
        check(net.values().stream().mapToLong(Long::longValue).sum() == 0, "adds up to zero");
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
