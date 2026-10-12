function mergeTwoLists(list1, list2) {
  const dummy = new ListNode(); // placeholder in front of the merged list
  let tail = dummy;
  while (list1 && list2) {
    if (list1.val <= list2.val) {
      tail.next = list1;
      list1 = list1.next;
    } else {
      tail.next = list2;
      list2 = list2.next;
    }
    tail = tail.next;
  }
  tail.next = list1 ?? list2; // one list is used up; the rest of the other is already sorted
  return dummy.next;
}
