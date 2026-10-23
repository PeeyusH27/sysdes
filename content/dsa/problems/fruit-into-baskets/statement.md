Trees stand in a row, and `fruits[i]` is the kind of fruit growing on tree `i`. You carry two baskets, and **each basket holds only one kind** of fruit (but any amount of it).

You pick a starting tree and then walk to the right, picking exactly one fruit from every tree you pass. You must stop at the first tree whose fruit fits in neither basket. You cannot skip trees.

Return the largest number of fruits you can pick. Equivalently: the length of the longest contiguous stretch of trees that contains at most two different kinds of fruit.

### Constraints

- `1 <= fruits.length <= 10^5`
- `0 <= fruits[i] < fruits.length`
