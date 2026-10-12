### Intuition

In a sorted dictionary, two neighbouring words tell you exactly one thing: at the **first position where they differ**, the letter in the first word comes before the letter in the second. "cat" before "cow" says `a` comes before `o`, and nothing at all about `t` and `w`. Comparing words that are further apart adds nothing new, because those facts already follow from the neighbouring pairs.

Each fact is a directed edge between two letters. An alphabet that keeps the list sorted is a **topological order** of this letter graph, and any one will do. If the edges form a cycle, no alphabet works and the answer is `""`.

One more trap: if a word is followed by its own proper prefix ("apple" before "app"), no alphabet can fix that either, so the answer is `""`.

### Step by step

1. Create a node (an empty Set of successors, in-degree 0) for **every letter that appears** in any word.
2. For each neighbouring pair `a = words[i]` and `b = words[i + 1]`:
   1. Find the first index `j` where `a[j] !== b[j]`.
   2. If there is no such index within the shorter word and `a` is longer than `b`, return `""`.
   3. If there is one, add the edge `a[j] → b[j]` (only if it isn't there yet) and increase the in-degree of `b[j]`.
3. Run Kahn's algorithm: queue every letter with in-degree 0; take a letter, append it to the order, and decrease the in-degree of each successor, queueing those that reach 0.
4. If every letter was placed, return the order as a string. Otherwise a cycle blocked some letters: return `""`.

### Dry run: `words = ["qr", "qs", "ps", "psr", "rq"]`

| pair | first difference | edge |
|---|---|---|
| qr, qs | index 1: r vs s | r → s |
| qs, ps | index 0: q vs p | q → p |
| ps, psr | none; the shorter word comes first, which is fine | |
| psr, rq | index 0: p vs r | p → r |

The in-degrees are q 0, r 1, s 1, p 1. Kahn's takes `q` (now `p` has in-degree 0), then `p` (now `r` is free), then `r` (now `s` is free), then `s`. All four letters are placed, so the answer is `"qprs"`.

### Why it works

Every edge comes from a real fact about the alphabet, so a valid alphabet must respect all of them. In the other direction, an order that respects every edge makes each neighbouring pair compare correctly (given the prefix rule), and "each neighbour is in order" means the whole list is sorted. So the valid alphabets are exactly the topological orders of the letter graph, which exist exactly when it has no cycle.

### Edge cases

- **One word:** there are no edges, so its distinct letters in any order are correct.
- **Letters with no edges** (they only appear after a first difference, or in a single word) must still be in the output.
- **The same edge from two different pairs:** add it once. If you add it to the Set once but increase the in-degree twice, that letter's in-degree never reaches 0 and you wrongly report a cycle.
- `["abc", "ab"]` is invalid, but `["ab", "abc"]` is fine.

### Common mistakes

- Comparing beyond the first difference: "cat" before "cow" says nothing about `t` and `w`.
- Forgetting the letters that are not part of any edge.
- Missing the prefix rule, which no graph edge can express.
- Building the in-degree from a list that contains repeated edges, while the successor Set stores each edge once.
