import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/log *.java && java -cp /tmp/log LoggerTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class LoggerTest {
    public static void main(String[] args) {
        test("an event below the effective level is dropped, at or above is written", LoggerTest::threshold);
        test("a child inherits the nearest ancestor level; an explicit level wins", LoggerTest::inheritance);
        test("changing a level at runtime changes every descendant that inherits it", LoggerTest::runtimeChange);
        test("appenders on an ancestor receive events from its descendants", LoggerTest::ancestors);
        test("each appender has its own threshold", LoggerTest::perAppender);
        test("the formatter is swappable per appender", LoggerTest::formatters);
        test("a lazy message is built only when the level is enabled", LoggerTest::lazy);
        test("an appender added during a call does not disturb that call (copy on write)", LoggerTest::copyOnWrite);
        test("one appender that throws does not stop the others", LoggerTest::isolation);
        test("an async appender writes in order, and close flushes everything", LoggerTest::asyncOrder);
        test("a full DROP queue loses the newest events and counts them", LoggerTest::asyncDrop);
        test("a BLOCK queue slows the producer but loses nothing", LoggerTest::asyncBlock);
        test("8 threads share one appender: every line arrives whole", LoggerTest::concurrent);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    // A manager with a fake clock that ticks once per call
    static LogManager manager() {
        AtomicLong t = new AtomicLong();
        return new LogManager(t::incrementAndGet, Level.INFO);
    }

    static final class Mem {
        final List<String> lines = Collections.synchronizedList(new ArrayList<>());
        final SinkAppender appender;

        Mem(Level threshold, Formatter f) { appender = new SinkAppender(lines::add, threshold, f); }

        Mem() { this(Level.DEBUG, Formatter.PLAIN); }
    }

    static void threshold() {
        LogManager m = manager();
        Mem mem = new Mem();
        m.root().addAppender(mem.appender);
        check(m.getLogger("app").log(Level.DEBUG, "noise") == 0, "debug dropped");
        check(m.getLogger("app").log(Level.INFO, "hello") == 1, "info written");
        check(mem.lines.equals(List.of("1 INFO app - hello")), mem.lines.toString());
    }

    static void inheritance() {
        LogManager m = manager();
        m.getLogger("app").setLevel(Level.WARN);
        m.getLogger("app.db.pool").setLevel(Level.DEBUG);
        check(m.getLogger("app.db").effectiveLevel() == Level.WARN, "inherits app");
        check(m.getLogger("app.db.pool").effectiveLevel() == Level.DEBUG, "explicit wins");
        check(m.getLogger("other").effectiveLevel() == Level.INFO, "inherits root");
    }

    static void runtimeChange() {
        LogManager m = manager();
        Logger db = m.getLogger("app.db");
        check(!db.isEnabled(Level.DEBUG), "off at first");
        m.getLogger("app").setLevel(Level.DEBUG);
        check(db.isEnabled(Level.DEBUG), "on after the parent changed");
    }

    static void ancestors() {
        LogManager m = manager();
        Mem a = new Mem();
        Mem b = new Mem();
        m.getLogger("app").addAppender(a.appender);
        m.getLogger("app.db").addAppender(b.appender);
        check(m.getLogger("app.db").log(Level.ERROR, "down") == 2, "two appenders wrote");
        check(a.lines.size() == 1 && b.lines.size() == 1, "one line each");
    }

    static void perAppender() {
        LogManager m = manager();
        Mem console = new Mem(Level.INFO, Formatter.PLAIN);
        Mem file = new Mem(Level.ERROR, Formatter.PLAIN);
        m.root().addAppender(console.appender);
        m.root().addAppender(file.appender);
        Logger log = m.getLogger("svc");
        check(log.log(Level.INFO, "a") == 1, "info reaches the console only");
        check(log.log(Level.ERROR, "b") == 2, "error reaches both");
        check(console.lines.size() == 2, "console has two");
        check(file.lines.equals(List.of("2 ERROR svc - b")), file.lines.toString());
    }

    static void formatters() {
        LogManager m = manager();
        Mem p = new Mem();
        Mem j = new Mem(Level.DEBUG, Formatter.JSON);
        m.root().addAppender(p.appender);
        m.root().addAppender(j.appender);
        m.getLogger("a").log(Level.WARN, "x \"y\"");
        check(j.lines.equals(List.of("{\"time\":1,\"level\":\"WARN\",\"logger\":\"a\",\"message\":\"x \\\"y\\\"\"}")), j.lines.toString());
        check(p.lines.equals(List.of("1 WARN a - x \"y\"")), p.lines.toString());
    }

    static void lazy() {
        LogManager m = manager();
        int[] built = {0};
        Logger log = m.getLogger("a");
        log.log(Level.DEBUG, () -> { built[0]++; return "expensive"; });
        check(built[0] == 0, "not built while disabled");
        log.log(Level.INFO, () -> { built[0]++; return "expensive"; });
        check(built[0] == 1, "built once when enabled");
    }

    static void copyOnWrite() {
        LogManager m = manager();
        Mem late = new Mem();
        Logger log = m.getLogger("a");
        log.addAppender(r -> { log.addAppender(late.appender); return true; });
        check(log.log(Level.INFO, "one") == 1, "the new appender missed this call");
        check(log.log(Level.INFO, "two") == 2, "and joined the next");
        check(late.lines.size() == 1, "one line in late");
    }

    static void isolation() {
        LogManager m = manager();
        Mem ok = new Mem();
        m.root().addAppender(r -> { throw new IllegalStateException("disk full"); });
        m.root().addAppender(ok.appender);
        check(m.getLogger("a").log(Level.INFO, "still here") == 1, "the healthy appender wrote");
        check(ok.lines.size() == 1, "one line");
    }

    static void asyncOrder() throws InterruptedException {
        LogManager m = manager();
        Mem mem = new Mem();
        AsyncAppender async = new AsyncAppender(mem.appender, 100, Overflow.DROP);
        m.root().addAppender(async);
        for (int i = 0; i < 50; i++) m.getLogger("a").log(Level.INFO, "m" + i);
        async.close();
        check(mem.lines.size() == 50, "all 50 flushed on close, got " + mem.lines.size());
        check(mem.lines.get(0).endsWith("m0") && mem.lines.get(49).endsWith("m49"), "in order");
    }

    static void asyncDrop() throws InterruptedException {
        CountDownLatch gate = new CountDownLatch(1);
        List<String> out = Collections.synchronizedList(new ArrayList<>());
        SinkAppender slow = new SinkAppender(line -> {
            try { gate.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            out.add(line);
        });
        AsyncAppender async = new AsyncAppender(slow, 2, Overflow.DROP);
        for (int i = 0; i < 20; i++) async.append(new LogRecord(i, Level.INFO, "a", "m" + i));
        long dropped = async.dropped();
        gate.countDown();
        async.close();
        check(dropped >= 17 && dropped <= 18, "dropped " + dropped);  // the worker holds one, the queue two
        check(out.size() + dropped == 20, "written plus dropped is 20, got " + out.size());
    }

    static void asyncBlock() throws Exception {
        List<String> out = Collections.synchronizedList(new ArrayList<>());
        SinkAppender slow = new SinkAppender(line -> {
            try { Thread.sleep(1); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            out.add(line);
        });
        AsyncAppender async = new AsyncAppender(slow, 2, Overflow.BLOCK);
        for (int i = 0; i < 40; i++) async.append(new LogRecord(i, Level.INFO, "a", "m" + i));
        async.close();
        check(out.size() == 40 && async.dropped() == 0, "nothing lost, got " + out.size());
    }

    static void concurrent() throws Exception {
        LogManager m = manager();
        Mem mem = new Mem();
        m.root().addAppender(mem.appender);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> done = new ArrayList<>();
        for (int w = 0; w < 8; w++) {
            final int id = w;
            done.add(pool.submit(() -> {
                for (int i = 0; i < 500; i++) m.getLogger("w" + id).log(Level.INFO, "line-" + i);
            }));
        }
        try {
            for (Future<?> f : done) f.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
        check(mem.lines.size() == 4000, "4000 lines, got " + mem.lines.size());
        for (String line : mem.lines) check(line.contains(" INFO w") && line.contains(" - line-"), "whole line: " + line);
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
