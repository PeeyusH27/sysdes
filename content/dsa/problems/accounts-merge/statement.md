You are given a list of account records, `accounts`. In each record `accounts[i]`, the first string is a person's **name** and the remaining strings are **email addresses** on that account.

Two records belong to the same person if they have at least one email address in common. This chains: if record A shares an email with record B, and B shares one with record C, then A, B and C all belong to one person even if A and C share nothing directly. Two records with the same name but no such link may belong to different people. All records of one person carry the same name.

Merge the records and return one entry per person, in this format: the name first, followed by **every distinct email** of that person sorted in plain string order (the order `Array.prototype.sort()` gives with no comparator). The people may be listed in any order.

### Constraints

- `1 <= accounts.length <= 1000`
- `2 <= accounts[i].length <= 10`
- `1 <= accounts[i][j].length <= 30`
- Names contain letters only. Emails contain lowercase letters, digits, `.` and `@`.
