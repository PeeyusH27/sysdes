from lists import from_array, ListNode, to_array  # @hide
from reverse import reverse_list  # @hide
from dummy_head import merge_sorted, remove_all  # @hide
from splice import reverse_after, swap_pairs  # @hide
from weave import fold  # @hide
# Edit the inputs and press Run. from_array builds a list and to_array reads it back.
print(to_array(reverse_list(from_array([1, 2, 3, 4, 5]))))                    # [5, 4, 3, 2, 1]
print(to_array(remove_all(from_array([6, 1, 6, 6, 2, 6]), 6)))                # [1, 2]
print(to_array(merge_sorted(from_array([1, 4, 9]), from_array([2, 3, 10]))))  # [1, 2, 3, 4, 9, 10]

dummy = ListNode(0, from_array([1, 2, 3, 4, 5, 6]))
reverse_after(dummy.next.next, 3)                                             # the 3 nodes after node 2
print(to_array(dummy.next))                                                   # [1, 2, 5, 4, 3, 6]
print(to_array(swap_pairs(from_array([1, 2, 3, 4, 5]))))                      # [2, 1, 4, 3, 5]
print(to_array(fold(from_array([1, 2, 3, 4, 5, 6]))))                         # [1, 6, 2, 5, 3, 4]
