import unittest

from lists import ListNode, from_array, to_array
from splice import reverse_after, swap_pairs


class TestSplice(unittest.TestCase):
    def test_reverse_after_reverses_a_middle_segment_and_returns_its_new_tail(self):
        dummy = ListNode(0, from_array([1, 2, 3, 4, 5, 6]))
        tail = reverse_after(dummy.next.next, 3)
        self.assertEqual(to_array(dummy.next), [1, 2, 5, 4, 3, 6])
        self.assertEqual(tail.val, 3)

    def test_reverse_after_on_the_dummy_changes_the_head(self):
        dummy = ListNode(0, from_array([1, 2, 3, 4]))
        reverse_after(dummy, 4)
        self.assertEqual(to_array(dummy.next), [4, 3, 2, 1])

    def test_swap_pairs_reverses_groups_of_two_and_leaves_an_odd_node_alone(self):
        self.assertEqual(to_array(swap_pairs(from_array([1, 2, 3, 4, 5]))), [2, 1, 4, 3, 5])
        self.assertEqual(to_array(swap_pairs(from_array([1, 2, 3, 4]))), [2, 1, 4, 3])
        self.assertEqual(to_array(swap_pairs(from_array([1]))), [1])
        self.assertIsNone(swap_pairs(None))


if __name__ == "__main__":
    unittest.main()
