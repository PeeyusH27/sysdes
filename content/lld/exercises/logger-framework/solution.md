A logging framework looks big, but its core is three small ideas: a tree found by name, two independent filters, and a format that is just a function. Build those and the rest is bookkeeping.

1. **Let the names be the tree.** The parent of `"a.b.c"` is `"a.b"`, and the parent of `"a"` is `"root"`. A `parent(name)` function replaces a parent table, so there is nothing to keep in step when a logger first appears, and no logger needs creating ahead of time.
2. **Store only what was set.** `levels` holds an entry only for loggers with their own level. `effectiveLevel` walks up with `parent` until it finds one, and the root always has one, so the walk ends. `"INHERIT"` is just deleting the entry, which is why a child follows a parent's later change with no extra code.
3. **Keep appenders in one place.** `appenders` maps a name to its threshold, format and lines. `attached` maps a logger name to the appender names on it. Removing an appender touches both, and the lines go with it.
4. **Filter twice, in the right order.** First the logger's effective level, and return `0` before doing anything else, which is the cheap path a real framework needs. Then, for each appender on the path from the logger up to root, its own threshold. Neither filter can undo the other, which is what the last two tests check.
5. **Make a format a function in a table.** `FORMATS` maps `"plain"` and `"json"` to functions. A third format is one new entry, and `log` does not change. This is Strategy without a class hierarchy, and a table of functions is enough in JavaScript and Python.
6. **Count what was written.** `log` returns the number of appenders that wrote. It makes the filters observable in tests and gives callers a cheap way to see a line was lost.
7. **Return sentinels.** An unknown level gives `-1`, an unknown appender has `[]` lines, and a refused setup returns `false` without half-creating anything. Check everything before you mutate.

Where the design bends: a lazy message (a function called only after the level check) fits at the top of `log`. A file sink or a queue replaces the `lines.push` call, and an async wrapper is a decorator around that one line. Locking goes around the write, so two threads never interleave a line, and the appender list is replaced rather than edited so a call in flight can iterate it safely.

Cost: a call is O(depth of the name plus appenders on the path), with no work at all when the level is off. A busy system would cache each logger's effective level and clear the cache when any level changes.
