// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out MinMaxStackTest
final class MinMaxStackTest {
    public static void main(String[] args) {
        Check.test("min and max track the current contents", () -> {
            MinMaxStack s = new MinMaxStack();
            for (int v : new int[] {3, 5, 2}) s.push(v);
            Check.eq(new int[] {s.getMin(), s.getMax()}, new int[] {2, 5});
            Check.eq(s.pop(), 2);
            Check.eq(new int[] {s.getMin(), s.getMax(), s.top()}, new int[] {3, 5, 5});
        });
        Check.test("duplicates of the extreme value survive a pop", () -> {
            MinMaxStack s = new MinMaxStack();
            for (int v : new int[] {2, 1, 1}) s.push(v);
            s.pop();
            Check.eq(s.getMin(), 1);
            s.pop();
            Check.eq(s.getMin(), 2);
        });
        Check.test("a single value is both min and max", () -> {
            MinMaxStack s = new MinMaxStack();
            s.push(-7);
            Check.eq(new int[] {s.getMin(), s.getMax(), s.top()}, new int[] {-7, -7, -7});
        });
        Check.done();
    }
}
