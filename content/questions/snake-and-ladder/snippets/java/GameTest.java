import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/snake *.java && java -cp /tmp/snake GameTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class GameTest {
    public static void main(String[] args) {
        test("players alternate, and each move reports where it started and ended", GameTest::alternate);
        test("a ladder carries the player up", GameTest::ladder);
        test("a snake carries the player down", GameTest::snake);
        test("exact rule: an overshoot stays put, and an exact landing wins", GameTest::exactRule);
        test("finish rule: any roll that reaches the last square wins", GameTest::finishRule);
        test("bounce rule: the extra steps walk back from the last square", GameTest::bounceRule);
        test("a six gives another turn only when the rule is on", GameTest::sixAgain);
        test("a ladder to the last square wins", GameTest::ladderWins);
        test("after a win nothing moves any more", GameTest::afterWin);
        test("the board rejects jumps that would break the game", GameTest::badBoards);
        test("listeners hear every move", GameTest::listeners);
        test("the dice are swappable: fixed rolls repeat, seeded random rolls stay in 1 to 6", GameTest::dice);
        test("one game shared by 4 threads: exactly one winner, every move heard once", GameTest::sharedGame);
        test("8 independent games on 8 threads all finish", GameTest::manyGames);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static Game make(Dice dice, Rule rule, boolean sixAgain, Map<Integer, Integer> jumps) {
        return new Game(new Board(10, jumps), List.of("A", "B"), dice, rule, sixAgain);
    }

    static Game make(Dice dice, Map<Integer, Integer> jumps) { return make(dice, Rule.FINISH, false, jumps); }

    static MoveResult play(Game g) { return g.play().orElseThrow(); }

    static void alternate() {
        Game g = make(new FixedDice(3, 4), Map.of());
        check(play(g).equals(new MoveResult("A", 3, 0, 3, Event.MOVE)), "A moves 3");
        check(play(g).equals(new MoveResult("B", 4, 0, 4, Event.MOVE)), "B moves 4");
        check(play(g).player().equals("A"), "back to A");
    }

    static void ladder() {
        MoveResult r = play(make(new FixedDice(3), Map.of(3, 8)));
        check(r.to() == 8 && r.event() == Event.LADDER, r.toString());
    }

    static void snake() {
        Game g = make(new FixedDice(5), Map.of(9, 2));
        g.place("A", 4);
        MoveResult r = play(g);
        check(r.from() == 4 && r.to() == 2 && r.event() == Event.SNAKE, r.toString());
    }

    static void exactRule() {
        Game g = make(new FixedDice(3, 1, 2), Rule.EXACT, false, Map.of());
        g.place("A", 8);
        MoveResult stay = play(g);
        check(stay.player().equals("A") && stay.to() == 8 && stay.event() == Event.STAY, stay.toString());
        play(g);  // B rolls 1
        MoveResult win = play(g);
        check(win.to() == 10 && win.event() == Event.WIN, win.toString());
        check(g.winner().equals(Optional.of("A")), "A won");
    }

    static void finishRule() {
        Game g = make(new FixedDice(5), Map.of());
        g.place("A", 8);
        MoveResult r = play(g);
        check(r.to() == 10 && r.event() == Event.WIN, r.toString());
    }

    static void bounceRule() {
        check(Rule.BOUNCE.apply(8, 4, 10).getAsInt() == 8, "8 + 4 bounces back to 8");
        check(Rule.BOUNCE.apply(8, 6, 10).getAsInt() == 6, "8 + 6 bounces back to 6");
        check(Rule.BOUNCE.apply(8, 2, 10).getAsInt() == 10, "8 + 2 lands on 10");
    }

    static void sixAgain() {
        Game on = make(new FixedDice(6, 2), Rule.FINISH, true, Map.of());
        check(play(on).player().equals("A"), "A rolls the six");
        check(play(on).player().equals("A"), "A goes again");
        check(play(on).player().equals("B"), "then B");
        Game off = make(new FixedDice(6, 2), Map.of());
        check(play(off).player().equals("A") && play(off).player().equals("B"), "no extra turn");
    }

    static void ladderWins() {
        MoveResult r = play(make(new FixedDice(2), Map.of(2, 10)));
        check(r.to() == 10 && r.event() == Event.WIN, r.toString());
    }

    static void afterWin() {
        Game g = make(new FixedDice(6), Map.of());
        g.place("A", 6);
        play(g);
        check(g.play().isEmpty(), "no move after the win");
        check(g.position("B") == 0, "B never moved");
    }

    static void expectBad(int size, Map<Integer, Integer> jumps, String why) {
        try {
            new Board(size, jumps);
        } catch (IllegalArgumentException e) {
            return;
        }
        check(false, why + " should be rejected");
    }

    static void badBoards() {
        expectBad(10, Map.of(10, 3), "a jump from the last square");
        expectBad(10, Map.of(4, 11), "a jump off the board");
        expectBad(10, Map.of(4, 4), "a jump that goes nowhere");
        expectBad(10, Map.of(3, 6, 6, 1), "a chain, which could loop");
        check(new Board(10, Map.of(3, 6, 8, 1)).land(8) == 1, "a valid board lands on the tail");
    }

    static void listeners() {
        Game g = make(new FixedDice(1, 2), Map.of());
        List<String> heard = new ArrayList<>();
        g.on(r -> heard.add(r.player() + ":" + r.to()));
        play(g);
        play(g);
        check(heard.equals(List.of("A:1", "B:2")), heard.toString());
    }

    static void dice() {
        FixedDice fixed = new FixedDice(2, 5);
        check(fixed.roll() == 2 && fixed.roll() == 5 && fixed.roll() == 2, "fixed rolls repeat");
        Random random = new Random(11);
        RandomDice d = new RandomDice(random::nextDouble, 6);
        Set<Integer> seen = new HashSet<>();
        for (int i = 0; i < 600; i++) {
            int r = d.roll();
            check(r >= 1 && r <= 6, "roll " + r);
            seen.add(r);
        }
        check(seen.size() == 6, "all six faces appear");
    }

    static void sharedGame() throws Exception {
        Random random = new Random(5);
        Game g = new Game(new Board(30, Map.of(3, 12, 20, 6)), List.of("A", "B", "C"),
                new RandomDice(() -> { synchronized (random) { return random.nextDouble(); } }, 6), Rule.EXACT, true);
        AtomicInteger heard = new AtomicInteger();
        AtomicInteger wins = new AtomicInteger();
        g.on(r -> {
            heard.incrementAndGet();
            if (r.event() == Event.WIN) wins.incrementAndGet();
        });
        ExecutorService pool = Executors.newFixedThreadPool(4);
        AtomicInteger played = new AtomicInteger();
        List<Future<?>> done = new ArrayList<>();
        for (int t = 0; t < 4; t++) {
            done.add(pool.submit(() -> {
                for (int i = 0; i < 5000 && g.play().map(r -> played.incrementAndGet()).isPresent(); i++) { /* keep rolling */ }
            }));
        }
        try {
            for (Future<?> f : done) f.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
        check(g.winner().isPresent() && wins.get() == 1, "one winner, got " + wins.get());
        check(heard.get() == played.get(), "heard " + heard.get() + " of " + played.get());
    }

    static void manyGames() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<Boolean>> done = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            final int seed = t;
            done.add(pool.submit(() -> {
                Random random = new Random(seed);
                Game g = new Game(new Board(30, Map.of(4, 14, 17, 7)), List.of("A", "B"), new RandomDice(random::nextDouble, 6), Rule.FINISH, false);
                for (int i = 0; i < 10_000 && g.winner().isEmpty(); i++) g.play();
                return g.winner().isPresent();
            }));
        }
        try {
            for (Future<Boolean> f : done) check(f.get(30, TimeUnit.SECONDS), "every game finishes");
        } finally {
            pool.shutdownNow();
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
}
