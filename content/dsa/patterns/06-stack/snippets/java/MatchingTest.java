// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out MatchingTest
final class MatchingTest {
    public static void main(String[] args) {
        Check.test("accepts properly nested brackets", () -> {
            Check.eq(Matching.isBalanced("{[()()]}"), true);
            Check.eq(Matching.isBalanced("()[]{}"), true);
            Check.eq(Matching.isBalanced(""), true);
        });
        Check.test("rejects crossed, unclosed and unopened brackets", () -> {
            Check.eq(Matching.isBalanced("([)]"), false);
            Check.eq(Matching.isBalanced("(()"), false);
            Check.eq(Matching.isBalanced("())"), false);
            Check.eq(Matching.isBalanced("]"), false);
        });
        Check.test("simplifies a path by undoing the latest directory on ..", () -> {
            Check.eq(Matching.simplifyPath("/home//user/./docs/../pics/"), "/home/user/pics");
            Check.eq(Matching.simplifyPath("/a/b/../../.."), "/");
            Check.eq(Matching.simplifyPath("/"), "/");
        });
        Check.done();
    }
}
