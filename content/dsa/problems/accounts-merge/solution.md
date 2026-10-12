### Intuition

Treat every record as a node, and draw an edge between two records whenever they share an email. A person is then a **connected component** of records, which is exactly what union-find tracks.

You don't need to compare every pair of records to find the shared emails. Walk through the emails once with a `Map` from email to **the first record that listed it**. When an email shows up again in another record, union the two records. Once every email has been seen, each record's root tells you which person it belongs to.

### Step by step

1. Create a union-find over the record indices `0 … accounts.length - 1`.
2. Create `owner = new Map()` (email → first record index).
3. For each record `i` and each email in it (skip index 0, the name):
   - If `owner` already has the email, `union(i, owner.get(email))`.
   - Otherwise `owner.set(email, i)`.
4. Group the emails by person: for each `[email, i]` in `owner`, push `email` into `groups[find(i)]`. Every email is in `owner` exactly once, so duplicates disappear here.
5. For each group, sort the emails with plain `sort()` and output `[accounts[root][0], ...emails]`.

### Dry run: `[["Kim","k1@m.io","k2@m.io"], ["Kim","k3@m.io"], ["Kim","k2@m.io","k3@m.io"]]`

| record | email | already owned by | action |
|---|---|---|---|
| 0 | k1@m.io | no one | owner[k1] = 0 |
| 0 | k2@m.io | no one | owner[k2] = 0 |
| 1 | k3@m.io | no one | owner[k3] = 1 |
| 2 | k2@m.io | record 0 | union(2, 0): parent[0] = 2 |
| 2 | k3@m.io | record 1 | union(2, 1): parent[1] = 2 |

Now `find(0) = find(1) = find(2) = 2`, so all three emails land in one group: `["Kim", "k1@m.io", "k2@m.io", "k3@m.io"]`. Records 0 and 1 never shared an email directly; record 2 linked them.

### Edge cases

- The same email twice inside one record: the second time, `union(i, i)` is a harmless no-op, and the email is stored once.
- Same name, no shared email (`["Lee","lee@a.com"]` and `["Lee","lee@b.com"]`): two separate people, two entries.
- A record whose only email appears elsewhere is fully absorbed into the other person's entry.

### Common mistakes

- Merging records by **name**. Names are not unique; only shared emails link records.
- Merging only records that share an email directly, in one pass. That misses chains like the dry run, where record 2 is what connects records 0 and 1.
- Forgetting to remove duplicate emails, or to sort them.
- Sorting with `(a, b) => a - b`: subtracting strings gives `NaN`, so the order is unpredictable. Plain `sort()` compares strings, which is what the problem asks for.

### Other ways to solve it

Build a graph whose nodes are **emails**: link the first email of each record to every other email in it. Then DFS from each unvisited email to collect a component and sort it. The cost is the same, O(E log E) for E emails, dominated by sorting.
