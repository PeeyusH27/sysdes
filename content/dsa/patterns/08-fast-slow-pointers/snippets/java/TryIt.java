final class TryIt {
    static int digitSquares(int n) {
        int sum = 0;
        for (char d : String.valueOf(n).toCharArray()) sum += (d - '0') * (d - '0');
        return sum;
    }

    public static void main(String[] args) {
        // Edit the inputs and run. Lists.fromArray(values, pos) links the tail back to index pos (-1: no cycle).
        System.out.println(Lists.toList(Middle.middleNode(Lists.fromArray(1, 2, 3, 4, 5))));    // [3, 4, 5]
        System.out.println(Lists.toList(Middle.middleNode(Lists.fromArray(1, 2, 3, 4, 5, 6)))); // [4, 5, 6]

        ListNode looped = Lists.fromArray(new int[] {3, 8, 5, 1, 9, 4, 7}, 2);
        System.out.println(Cycle.hasCycle(looped) + " " + Cycle.cycleStart(looped).val);        // true 5
        System.out.println(Cycle.hasCycle(Lists.fromArray(1, 2, 3)));                           // false

        System.out.println(Sequence.floyd(TryIt::digitSquares, 19)); // Loop[start=1, tail=4, length=1]: 19 is happy
        System.out.println(Sequence.floyd(TryIt::digitSquares, 2));  // Loop[start=4, tail=1, length=8]: 2 is not
    }
}
