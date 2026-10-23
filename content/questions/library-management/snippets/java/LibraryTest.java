import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/lib *.java && java -cp /tmp/lib LibraryTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class LibraryTest {
    public static void main(String[] args) {
        test("a loan is due after the member type's loan period", LibraryTest::dueDates);
        test("a standard member may hold 3 loans, a premium member 5", LibraryTest::limits);
        test("with no free copy a borrow fails, and returning frees it", LibraryTest::noCopy);
        test("fines: free on time, per day when late, capped, and cheaper for premium", LibraryTest::fines);
        test("fine policies compose: a grace period wrapped around a capped per-day fine", LibraryTest::composed);
        test("reservations are first come, first served, and the returned copy is held", LibraryTest::reservations);
        test("you cannot reserve a title that has a free copy", LibraryTest::reserveAvailable);
        test("an unclaimed hold lapses after 3 days and passes to the next member", LibraryTest::holdLapses);
        test("renewing: twice at most, never when overdue, never when someone is waiting", LibraryTest::renewing);
        test("an overdue notice is sent once per loan", LibraryTest::overdueOnce);
        test("a copy cannot skip states: an available copy cannot be held or lost", LibraryTest::stateMachine);
        test("search matches ISBN exactly and title or author in any case", LibraryTest::search);
        test("8 threads race for the last copy: exactly one gets it", LibraryTest::lastCopyRace);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static final class Rig {
        final Library lib = new Library();
        final List<String> events = new CopyOnWriteArrayList<>();

        Rig() {
            lib.addBook("111", "Dune", "Frank Herbert", 1);
            lib.addBook("222", "Emma", "Jane Austen", 3);
            for (String id : List.of("ann", "bob", "cy")) lib.join(id, MemberType.STANDARD);
            lib.join("pia", MemberType.PREMIUM);
            lib.onEvent(e -> events.add(e.type() + ":" + e.memberId()));
        }
    }

    static void dueDates() {
        Rig r = new Rig();
        check(r.lib.borrow("ann", "222", 10).value().due == 24, "standard: 14 days");
        check(r.lib.borrow("pia", "222", 10).value().due == 31, "premium: 21 days");
    }

    static void limits() {
        Rig r = new Rig();
        r.lib.addBook("333", "Ulysses", "James Joyce", 9);
        List<String> reasons = new ArrayList<>();
        for (int i = 0; i < 4; i++) reasons.add(r.lib.borrow("ann", "333", 1).reason());
        check(reasons.equals(Arrays.asList(null, null, null, "LIMIT_REACHED")), reasons.toString());
        List<Boolean> premium = new ArrayList<>();
        for (int i = 0; i < 6; i++) premium.add(r.lib.borrow("pia", "333", 1).ok());
        check(premium.equals(List.of(true, true, true, true, true, false)), premium.toString());
    }

    static void noCopy() {
        Rig r = new Rig();
        Loan loan = r.lib.borrow("ann", "111", 1).value();
        check("NO_COPY".equals(r.lib.borrow("bob", "111", 1).reason()), "taken");
        r.lib.returnItem(loan.id, 5);
        check(r.lib.borrow("bob", "111", 5).ok(), "free again");
    }

    static void fines() {
        Rig r = new Rig();
        Loan a = r.lib.borrow("ann", "222", 0).value();
        Loan b = r.lib.borrow("ann", "222", 0).value();
        Loan c = r.lib.borrow("pia", "222", 0).value();
        check(r.lib.returnItem(a.id, 14).value() == 0, "on time");
        check(r.lib.returnItem(b.id, 18).value() == 100, "4 days at 25");
        check(r.lib.returnItem(c.id, 25).value() == 40, "premium 4 days at 10");
        Loan d = r.lib.borrow("ann", "222", 0).value();
        check(r.lib.returnItem(d.id, 14 + 90).value() == 1000, "the cap");
    }

    static void composed() {
        FinePolicy policy = new GraceFine(new CappedFine(new PerDayFine(50), 200), 2);
        List<Integer> got = IntStream.of(0, 2, 3, 5, 20).map(policy::fine).boxed().collect(Collectors.toList());
        check(got.equals(List.of(0, 0, 50, 150, 200)), got.toString());
    }

    static void reservations() {
        Rig r = new Rig();
        Loan loan = r.lib.borrow("ann", "111", 1).value();
        check(r.lib.reserve("bob", "111").value() == 1, "bob first");
        check(r.lib.reserve("cy", "111").value() == 2, "cy second");
        check("ALREADY_WAITING".equals(r.lib.reserve("bob", "111").reason()), "no double queue");
        r.lib.returnItem(loan.id, 3);
        check(r.events.contains("ready:bob"), "bob told");
        check("NO_COPY".equals(r.lib.borrow("cy", "111", 3).reason()), "held for bob");
        check(r.lib.borrow("bob", "111", 3).ok(), "bob picks it up");
    }

    static void reserveAvailable() {
        Rig r = new Rig();
        check("COPY_AVAILABLE".equals(r.lib.reserve("ann", "222").reason()), "borrow instead");
    }

    static void holdLapses() {
        Rig r = new Rig();
        Loan loan = r.lib.borrow("ann", "111", 1).value();
        r.lib.reserve("bob", "111");
        r.lib.reserve("cy", "111");
        r.lib.returnItem(loan.id, 2);  // held for bob until day 5
        r.lib.sweep(5);
        check(!r.events.contains("holdExpired:bob"), "still held on day 5");
        r.lib.sweep(6);
        check(r.events.contains("holdExpired:bob") && r.events.contains("ready:cy"), "passed to cy");
        check(r.lib.borrow("cy", "111", 6).ok(), "cy borrows");
    }

    static void renewing() {
        Rig r = new Rig();
        Loan loan = r.lib.borrow("ann", "222", 0).value();
        check(r.lib.renew(loan.id, 10).value() == 28, "first renewal");
        check(r.lib.renew(loan.id, 20).value() == 42, "second renewal");
        check("RENEWAL_LIMIT".equals(r.lib.renew(loan.id, 30).reason()), "limit");
        Loan late = r.lib.borrow("bob", "222", 0).value();
        check("OVERDUE".equals(r.lib.renew(late.id, 15).reason()), "overdue");
        Loan one = r.lib.borrow("cy", "111", 0).value();
        r.lib.reserve("bob", "111");
        check("RESERVED_BY_OTHERS".equals(r.lib.renew(one.id, 5).reason()), "someone waits");
    }

    static void overdueOnce() {
        Rig r = new Rig();
        r.lib.borrow("ann", "222", 0);
        r.lib.sweep(14);
        r.lib.sweep(15);
        r.lib.sweep(16);
        check(r.events.stream().filter(e -> e.startsWith("overdue")).count() == 1, "one notice");
    }

    static void stateMachine() {
        BookItem item = new BookItem("x#1", "x");
        mustThrow(() -> item.moveTo(ItemState.HELD), "available -> held");
        mustThrow(() -> item.moveTo(ItemState.LOST), "available -> lost");
        item.moveTo(ItemState.LOANED);
        item.moveTo(ItemState.LOST);
        mustThrow(() -> item.moveTo(ItemState.AVAILABLE), "lost is final");
    }

    static void search() {
        Rig r = new Rig();
        check(r.lib.search("222").equals(List.of("222")), "isbn");
        check(r.lib.search("dune").equals(List.of("111")), "title");
        check(r.lib.search("AUSTEN").equals(List.of("222")), "author");
        check(r.lib.search("nothing").isEmpty(), "nothing");
    }

    static void lastCopyRace() throws Exception {
        for (int round = 0; round < 100; round++) {
            Library lib = new Library();
            lib.addBook("111", "Dune", "Frank Herbert", 1);
            for (int m = 0; m < 8; m++) lib.join("m" + m, MemberType.STANDARD);
            CountDownLatch go = new CountDownLatch(1);
            ExecutorService pool = Executors.newFixedThreadPool(8);
            List<Future<Boolean>> results = new ArrayList<>();
            for (int m = 0; m < 8; m++) {
                final String id = "m" + m;
                results.add(pool.submit(() -> {
                    go.await();
                    return lib.borrow(id, "111", 1).ok();
                }));
            }
            go.countDown();
            int winners = 0;
            for (Future<Boolean> f : results) if (f.get(10, TimeUnit.SECONDS)) winners++;
            pool.shutdownNow();
            check(winners == 1, "exactly one winner, round " + round + " had " + winners);
        }
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

    static void mustThrow(Runnable body, String what) {
        try {
            body.run();
        } catch (IllegalStateException e) {
            return;
        }
        throw new AssertionError("expected an exception: " + what);
    }
}
