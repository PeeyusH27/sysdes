from seen_set import first_repeat  # @hide
from frequency import can_construct, count_all  # @hide
from complement import count_pairs  # @hide
from group_by_key import group_by  # @hide
# Edit the inputs and press Run. These are the four templates on this page.
print(first_repeat([4, 7, 2, 9, 7, 1]))          # 7
print(count_all("banana"))                       # {'b': 1, 'a': 3, 'n': 2}
print(can_construct("tooth", "photo"))           # False: only one t to spend
print(count_pairs([1, 5, 3, 3, 3, 7], 6))        # 4

sorted_letters = lambda w: "".join(sorted(w))
print(group_by(["tab", "cat", "bat", "act"], sorted_letters))  # [['tab', 'bat'], ['cat', 'act']]
