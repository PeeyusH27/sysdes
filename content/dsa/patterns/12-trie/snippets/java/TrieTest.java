import java.util.*;

// Run from this folder:  javac -d /tmp/trie *.java && java -cp /tmp/trie TrieTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class TrieTest {
    public static void main(String[] args) {
        test("search needs a whole word, startsWith any prefix", TrieTest::wholeWordVsPrefix);
        test("wordsWithPrefix lists completions", TrieTest::completions);
        test("array-of-26 trie stores and finds words", TrieTest::arrayTrie);
        test("wildcard: dots match any single character", TrieTest::dots);
        test("wildcard: length and whole-word rules still apply", TrieTest::wildcardRules);
        test("scan finds overlapping dictionary words", TrieTest::overlapping);
        test("scan: no matches and empty text", TrieTest::noMatches);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static Trie trieOf(String... words) {
        Trie t = new Trie();
        for (String w : words) t.insert(w);
        return t;
    }

    static void wholeWordVsPrefix() {
        Trie t = trieOf("car", "cat", "cart", "dog");
        check(t.search("car"));
        check(t.search("cart"));
        check(!t.search("ca"));
        check(t.startsWith("ca"));
        check(!t.search("cow"));
        check(!t.startsWith("cow"));
        check(t.startsWith(""));
    }

    static void completions() {
        Trie t = trieOf("car", "cat", "cart", "dog", "do");
        eq(sorted(t.wordsWithPrefix("ca")), List.of("car", "cart", "cat"));
        eq(sorted(t.wordsWithPrefix("do")), List.of("do", "dog"));
        eq(t.wordsWithPrefix("x"), List.of());
    }

    static void arrayTrie() {
        ArrayTrie t = new ArrayTrie();
        for (String w : new String[] {"apple", "app", "zebra"}) t.insert(w);
        check(t.search("app"));
        check(t.search("apple"));
        check(!t.search("appl"));
        check(!t.search("zeb"));
        check(t.search("zebra"));
        check(!t.search("b"));
    }

    static void dots() {
        Trie t = trieOf("bad", "bed", "cat", "cot");
        for (String p : new String[] {".at", "b.d", "c.t", "..."}) check(Wildcard.matchesPattern(t, p));
    }

    static void wildcardRules() {
        Trie t = trieOf("bad", "bed", "cat", "cot");
        for (String p : new String[] {"b.t", "..", "....", "x.."}) check(!Wildcard.matchesPattern(t, p));
    }

    static void overlapping() {
        Trie t = trieOf("he", "her", "hers", "she");
        eq(Scan.findAllMatches("ushers", t), List.of(
                new Scan.Match(1, "she"), new Scan.Match(2, "he"), new Scan.Match(2, "her"), new Scan.Match(2, "hers")));
    }

    static void noMatches() {
        Trie t = trieOf("cat");
        eq(Scan.findAllMatches("dog", t), List.of());
        eq(Scan.findAllMatches("", t), List.of());
        eq(Scan.findAllMatches("catcat", t), List.of(new Scan.Match(0, "cat"), new Scan.Match(3, "cat")));
    }

    static List<String> sorted(List<String> xs) {
        List<String> copy = new ArrayList<>(xs);
        Collections.sort(copy);
        return copy;
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
            System.out.println("FAIL  " + name + ": " + e);
        }
    }

    static void check(boolean condition) {
        if (!condition) throw new AssertionError("check failed");
    }

    static void eq(Object actual, Object expected) {
        if (!Objects.equals(actual, expected)) throw new AssertionError("expected " + expected + ", got " + actual);
    }
}
