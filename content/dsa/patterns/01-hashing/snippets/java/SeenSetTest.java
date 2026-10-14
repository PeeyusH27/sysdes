import java.util.List;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out SeenSetTest
final class SeenSetTest {
    public static void main(String[] args) {
        Check.test("returns the first value seen twice", () -> {
            Check.eq(SeenSet.firstRepeat(List.of(4, 7, 2, 9, 7, 1)), 7);
            Check.eq(SeenSet.firstRepeat(List.of(3, 1, 3, 1)), 3);
            Check.eq(SeenSet.firstRepeat(Frequency.chars("abcb")), 'b');
        });
        Check.test("returns null when every value is distinct", () -> {
            Check.eq(SeenSet.firstRepeat(List.of(5, 3, 8, 1)), null);
            Check.eq(SeenSet.firstRepeat(List.<Integer>of()), null);
        });
        Check.done();
    }
}
