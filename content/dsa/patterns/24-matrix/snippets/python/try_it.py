from rotate import rotate_clockwise, transpose  # @hide
from spiral import spiral_fill, spiral_order  # @hide
from markers import set_zeroes  # @hide
from life import game_of_life  # @hide
from sorted_matrix import search_flat, search_staircase  # @hide
from diagonals import diagonal_order  # @hide
# Edit the grids and press Run. These are the templates above.
grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
print(transpose([[1, 2, 3], [4, 5, 6]]))   # [[1, 4], [2, 5], [3, 6]]
r = [row[:] for row in grid]
rotate_clockwise(r)
print(r)   # [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
print(*spiral_order(grid))   # 1 2 3 6 9 8 7 4 5
print(spiral_fill(3))   # [[1, 2, 3], [8, 9, 4], [7, 6, 5]]
print(*diagonal_order(grid))   # 1 2 4 7 5 3 6 8 9

z = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
set_zeroes(z)
print(z)   # [[1, 0, 1], [0, 0, 0], [1, 0, 1]]

life = [[0, 1, 0], [0, 1, 0], [0, 1, 0]]
game_of_life(life)
print(life)   # [[0, 0, 0], [1, 1, 1], [0, 0, 0]]

print(search_flat([[1, 3, 5, 7], [10, 11, 16, 20]], 11), search_staircase([[1, 4, 7], [2, 5, 8], [3, 6, 9]], 6))   # True True
