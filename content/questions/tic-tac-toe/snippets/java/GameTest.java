import java.util.*;
import java.util.concurrent.*;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/ttt *.java && java -cp /tmp/ttt GameTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class GameTest {
    public static void main(String[] args) {
        test("X wins a row, and the game then refuses every move", GameTest::rowWin);
        test("both diagonals win", GameTest::diagonals);
        test("a mixed line never counts: X O X across a row is not a win", GameTest::mixedLine);
        test("a full board with no line is a draw; a last move that completes a line is a win, not a draw", GameTest::drawVersusWin);
        test("rejected moves change nothing and do not use up the turn", GameTest::rejected);
        test("undo takes back a winning move: board, turn, status and counters", GameTest::undoWin);
        test("a stale version is refused, so two clients cannot both act on the same board", GameTest::stale);
        test("wouldComplete is read-only", GameTest::readOnly);
        test("the counters agree with a brute-force scan over 300 random 4x4 games", GameTest::bruteForce);
        test("bots: take the win, else block, else the middle, else the first free cell", GameTest::bots);
        test("a 500 by 500 board plays a winning row without scanning anything", GameTest::bigBoard);
        test("two threads race for the same move: exactly one wins", GameTest::race);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static MoveResult last;

    static void play(Game g, Object... moves) {
        for (int i = 0; i < moves.length; i += 3) last = g.move((Mark) moves[i], (Integer) moves[i + 1], (Integer) moves[i + 2]);
    }

    static void rowWin() {
        Game g = new Game();
        play(g, Mark.X, 0, 0, Mark.O, 1, 0, Mark.X, 0, 1, Mark.O, 1, 1, Mark.X, 0, 2);
        check(last == MoveResult.WIN, "X completes the row");
        check(g.status() == Status.WON && g.winner().equals(Optional.of(Mark.X)), "won by X");
        check(g.move(Mark.O, 2, 2) == MoveResult.GAME_OVER, "game over");
    }

    static void diagonals() {
        Game a = new Game();
        play(a, Mark.X, 0, 0, Mark.O, 0, 1, Mark.X, 1, 1, Mark.O, 0, 2, Mark.X, 2, 2);
        check(last == MoveResult.WIN, "main diagonal");
        Game b = new Game();
        play(b, Mark.X, 0, 2, Mark.O, 0, 0, Mark.X, 1, 1, Mark.O, 0, 1, Mark.X, 2, 0);
        check(last == MoveResult.WIN, "anti-diagonal");
    }

    static void mixedLine() {
        Game g = new Game();
        play(g, Mark.X, 0, 0, Mark.O, 0, 1, Mark.X, 0, 2);
        check(last == MoveResult.OK && g.status() == Status.IN_PROGRESS, "no win");
    }

    static void drawVersusWin() {
        Game draw = new Game();
        play(draw, Mark.X, 0, 0, Mark.O, 0, 1, Mark.X, 0, 2, Mark.O, 1, 1, Mark.X, 1, 0, Mark.O, 1, 2, Mark.X, 2, 1, Mark.O, 2, 0, Mark.X, 2, 2);
        check(last == MoveResult.DRAW && draw.status() == Status.DRAW && draw.winner().isEmpty(), "draw");
        Game win = new Game();
        play(win, Mark.X, 0, 0, Mark.O, 0, 1, Mark.X, 1, 1, Mark.O, 0, 2, Mark.X, 1, 2, Mark.O, 1, 0, Mark.X, 2, 0, Mark.O, 2, 1, Mark.X, 2, 2);
        check(last == MoveResult.WIN && win.board().isFull() && win.status() == Status.WON, "win on the last cell");
    }

    static void rejected() {
        Game g = new Game();
        check(g.move(Mark.O, 0, 0) == MoveResult.NOT_YOUR_TURN, "O may not start");
        check(g.move(Mark.X, 3, 0) == MoveResult.INVALID_MOVE, "off the board");
        check(g.move(Mark.X, 0, 0) == MoveResult.OK, "valid move");
        check(g.move(Mark.O, 0, 0) == MoveResult.INVALID_MOVE, "taken");
        check(g.current() == Mark.O && g.version() == 1 && g.board().filled() == 1, "nothing else changed");
    }

    static void undoWin() {
        Game g = new Game();
        play(g, Mark.X, 0, 0, Mark.O, 1, 0, Mark.X, 0, 1, Mark.O, 1, 1, Mark.X, 0, 2);
        check(g.undo(), "undo works");
        check(g.status() == Status.IN_PROGRESS && g.winner().isEmpty() && g.current() == Mark.X && g.board().filled() == 4, "state restored");
        check(g.move(Mark.X, 2, 2) == MoveResult.OK, "a different move now");
        check(g.move(Mark.O, 1, 2) == MoveResult.WIN, "O completes the middle row");
        check(!new Game().undo(), "nothing to undo");
    }

    static void stale() {
        Game g = new Game();
        check(g.move(Mark.X, 0, 0, 0) == MoveResult.OK, "first");
        check(g.move(Mark.O, 1, 1, 0) == MoveResult.STALE, "O looked at version 0");
        check(g.move(Mark.O, 1, 1, 1) == MoveResult.OK, "fresh view");
    }

    static void readOnly() {
        Game g = new Game();
        play(g, Mark.X, 0, 0, Mark.O, 1, 0, Mark.X, 0, 1);
        int before = g.board().filled();
        check(g.board().wouldComplete(Mark.X, 0, 2), "X would win");
        check(!g.board().wouldComplete(Mark.O, 0, 2), "O would not");
        check(g.board().filled() == before && g.board().isFree(0, 2), "nothing changed");
    }

    static boolean scan(Board b, Mark m) {
        int n = b.size();
        boolean diag = true;
        boolean anti = true;
        for (int i = 0; i < n; i++) {
            boolean row = true;
            boolean col = true;
            for (int j = 0; j < n; j++) {
                row &= b.at(i, j) == m;
                col &= b.at(j, i) == m;
            }
            if (row || col) return true;
            diag &= b.at(i, i) == m;
            anti &= b.at(i, n - 1 - i) == m;
        }
        return diag || anti;
    }

    static void bruteForce() {
        Random rnd = new Random(11);
        for (int game = 0; game < 300; game++) {
            Game g = new Game(4);
            for (int i = 0; i < 16 && g.status() == Status.IN_PROGRESS; i++) {
                List<int[]> free = Bots.free(g.board());
                int[] cell = free.get(rnd.nextInt(free.size()));
                Mark mark = g.current();
                MoveResult res = g.move(mark, cell[0], cell[1]);
                check((res == MoveResult.WIN) == scan(g.board(), mark), "counters vs scan");
            }
        }
    }

    static void bots() {
        check(Arrays.equals(Bots.SENSIBLE.choose(new Game().board(), Mark.X), new int[] {1, 1}), "middle");
        Game g = new Game();
        play(g, Mark.X, 0, 0, Mark.O, 1, 0, Mark.X, 0, 1, Mark.O, 1, 1, Mark.X, 2, 2);
        check(Arrays.equals(Bots.SENSIBLE.choose(g.board(), Mark.O), new int[] {1, 2}), "win beats block");
        Game h = new Game();
        play(h, Mark.X, 0, 0, Mark.O, 1, 1, Mark.X, 0, 1);
        check(Arrays.equals(Bots.SENSIBLE.choose(h.board(), Mark.O), new int[] {0, 2}), "block");
        check(Arrays.equals(Bots.FIRST_FREE.choose(h.board(), Mark.O), new int[] {0, 2}), "first free");
    }

    static void bigBoard() {
        Game g = new Game(500);
        MoveResult res = null;
        for (int c = 0; c < 500; c++) {
            res = g.move(Mark.X, 0, c);
            if (c < 499) g.move(Mark.O, 1, c);
        }
        check(res == MoveResult.WIN, "X wins the top row");
        check(Arrays.equals(Bots.FIRST_FREE.choose(g.board(), Mark.O), new int[] {1, 499}), "first free cell");
    }

    static void race() throws Exception {
        for (int round = 0; round < 200; round++) {
            Game g = new Game();
            CountDownLatch go = new CountDownLatch(1);
            ExecutorService pool = Executors.newFixedThreadPool(2);
            List<Future<MoveResult>> results = new ArrayList<>();
            for (int t = 0; t < 2; t++) {
                results.add(pool.submit(() -> {
                    go.await();
                    return g.move(Mark.X, 0, 0, 0);  // both saw version 0
                }));
            }
            go.countDown();
            int ok = 0;
            for (Future<MoveResult> f : results) if (f.get(10, TimeUnit.SECONDS) == MoveResult.OK) ok++;
            pool.shutdownNow();
            check(ok == 1 && g.board().filled() == 1, "exactly one move applied, round " + round);
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
