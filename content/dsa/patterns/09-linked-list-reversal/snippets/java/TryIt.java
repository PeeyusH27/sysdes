final class TryIt {
    public static void main(String[] args) {
        // Edit the inputs and run. Lists.fromArray builds a list and Lists.toList reads it back.
        System.out.println(Lists.toList(Reverse.reverseList(Lists.fromArray(1, 2, 3, 4, 5))));                          // [5, 4, 3, 2, 1]
        System.out.println(Lists.toList(DummyHead.removeAll(Lists.fromArray(6, 1, 6, 6, 2, 6), 6)));                    // [1, 2]
        System.out.println(Lists.toList(DummyHead.mergeSorted(Lists.fromArray(1, 4, 9), Lists.fromArray(2, 3, 10))));   // [1, 2, 3, 4, 9, 10]

        ListNode dummy = new ListNode(0, Lists.fromArray(1, 2, 3, 4, 5, 6));
        Splice.reverseAfter(dummy.next.next, 3);                                                                        // the 3 nodes after node 2
        System.out.println(Lists.toList(dummy.next));                                                                   // [1, 2, 5, 4, 3, 6]
        System.out.println(Lists.toList(Splice.swapPairs(Lists.fromArray(1, 2, 3, 4, 5))));                             // [2, 1, 4, 3, 5]
        System.out.println(Lists.toList(Weave.fold(Lists.fromArray(1, 2, 3, 4, 5, 6))));                                // [1, 6, 2, 5, 3, 4]
    }
}
