from lists import from_array, to_array  # @hide
from middle import middle_node  # @hide
from cycle import cycle_start, has_cycle  # @hide
from sequence import floyd  # @hide
# Edit the inputs and press Run. from_array(values, pos) links the tail back to index pos (-1: no cycle).
print(to_array(middle_node(from_array([1, 2, 3, 4, 5]))))     # [3, 4, 5]
print(to_array(middle_node(from_array([1, 2, 3, 4, 5, 6]))))  # [4, 5, 6]

looped = from_array([3, 8, 5, 1, 9, 4, 7], 2)
print(has_cycle(looped), cycle_start(looped).val)             # True 5
print(has_cycle(from_array([1, 2, 3])))                       # False


def digit_squares(n):
    return sum(int(d) ** 2 for d in str(n))


print(floyd(digit_squares, 19))  # Loop(start=1, tail=4, length=1): 19 is happy
print(floyd(digit_squares, 2))   # Loop(start=4, tail=1, length=8): 2 is not
