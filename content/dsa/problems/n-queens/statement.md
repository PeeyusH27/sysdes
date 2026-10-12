A chess queen attacks every square in its row, its column and both of its diagonals. The **n-queens puzzle** asks you to place `n` queens on an `n × n` board so that no two queens attack each other.

Given `n`, return **every** distinct solution. Describe each solution as a board: an array of `n` strings, one per row from top to bottom, where `"Q"` marks a queen and `"."` an empty square. For example, `".Q.."` is a row of a 4 × 4 board with a queen in column 1.

Return the boards in any order. If there is no solution, return an empty array.

### Constraints

- `1 <= n <= 9`
