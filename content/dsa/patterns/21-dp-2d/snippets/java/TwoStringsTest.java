final class TwoStringsTest {
    static boolean isSubsequence(String t, String s) {
        int k = 0;
        for (char ch : s.toCharArray()) if (k < t.length() && ch == t.charAt(k)) k++;
        return k == t.length();
    }

    public static void main(String[] args) {
        Check.test("rebuilds a longest common subsequence", () -> {
            Check.eq("CLD", TwoStrings.lcsString("CLOUD", "COLD"));
            Check.eq("abc", TwoStrings.lcsString("abc", "abc"));
            String s = TwoStrings.lcsString("bdcaba", "abcbdab");
            Check.eq(4, s.length());
            Check.isTrue(isSubsequence(s, "bdcaba") && isSubsequence(s, "abcbdab"));
        });

        Check.test("returns the empty string when nothing is shared", () -> {
            Check.eq("", TwoStrings.lcsString("abc", "xyz"));
            Check.eq("", TwoStrings.lcsString("", "abc"));
            Check.eq("", TwoStrings.lcsString("", ""));
        });

        Check.finish();
    }
}
