import { fromArray, ListNode, toArray } from './list.js'; // @hide
import { reverseList } from './reverse.js'; // @hide
import { mergeSorted, removeAll } from './dummy-head.js'; // @hide
import { reverseAfter, swapPairs } from './splice.js'; // @hide
import { fold } from './weave.js'; // @hide
// Edit the inputs and press Run. fromArray builds a list and toArray reads it back.
console.log(toArray(reverseList(fromArray([1, 2, 3, 4, 5]))));                  // [5, 4, 3, 2, 1]
console.log(toArray(removeAll(fromArray([6, 1, 6, 6, 2, 6]), 6)));              // [1, 2]
console.log(toArray(mergeSorted(fromArray([1, 4, 9]), fromArray([2, 3, 10])))); // [1, 2, 3, 4, 9, 10]

const dummy = new ListNode(0, fromArray([1, 2, 3, 4, 5, 6]));
reverseAfter(dummy.next.next, 3);                                               // the 3 nodes after node 2
console.log(toArray(dummy.next));                                               // [1, 2, 5, 4, 3, 6]
console.log(toArray(swapPairs(fromArray([1, 2, 3, 4, 5]))));                    // [2, 1, 4, 3, 5]
console.log(toArray(fold(fromArray([1, 2, 3, 4, 5, 6]))));                      // [1, 6, 2, 5, 3, 4]
