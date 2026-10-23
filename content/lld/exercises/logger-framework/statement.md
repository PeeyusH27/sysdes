Build the core of a **logging framework**. Loggers form a tree by name, so `"app.db"` is a child of `"app"`, which is a child of `"root"`. Each logger may have its own level or inherit one. Appenders collect the lines, and each appender has its own threshold and its own format. The log call itself must not contain an `if (format === ...)` ladder, and adding a third format later must not mean editing the two that already work. This is Strategy for the formatter and Observer for the appender list.

Implement the class `LogManager`:

- `LogManager()`: starts with one logger, `"root"`, at level `"INFO"`, and no appenders. Any other logger springs into existence the first time its name is used.
- `setLevel(name, level)`: gives logger `name` its own level and returns `true`. The levels in order are `"DEBUG"`, `"INFO"`, `"WARN"`, `"ERROR"`. The special level `"INHERIT"` removes the logger's own level, so it uses its parent's again. Returns `false` and changes nothing for an unknown level, or for `"INHERIT"` on `"root"`.
- `effectiveLevel(name)`: the level that applies to `name`: its own if it has one, otherwise the nearest ancestor's.
- `addAppender(appender, logger, threshold, format)`: creates an appender called `appender`, attached to logger `logger`, that only writes records at `threshold` or above, in `format` (`"plain"` or `"json"`). Returns `true`. Returns `false` and creates nothing if the appender name is taken, or the threshold or format is unknown.
- `removeAppender(appender)`: detaches it and forgets its lines. Returns `true`, or `false` if there is no such appender. The name can be used again afterwards.
- `log(logger, level, message, time)`: returns how many appenders **wrote** the record. First the level check: if `level` is below the logger's effective level, nothing is written and the result is `0`. Otherwise the record goes to the appenders attached to `logger`, then to those attached to its parent, and so on up to `"root"`. Each of those appenders writes it only if `level` is at or above its own threshold. An unknown `level` returns `-1`.
- `lines(appender)`: every line the appender has written, oldest first. An unknown appender has no lines: `[]`.

**The two formats**

- `"plain"`: `<time> <LEVEL> <logger> - <message>`, for example `7 WARN app.db - slow query`.
- `"json"`: `JSON.stringify({time, level, logger, message})` with the keys in exactly that order and no spaces, for example `{"time":7,"level":"WARN","logger":"app.db","message":"slow query"}`. Quotes inside the message are escaped as in any JSON.

**Notes**

- A name has dots only as separators. The parent of `"a.b.c"` is `"a.b"`, the parent of `"a"` is `"root"`, and `"root"` has no parent.
- An appender's threshold does not change the logger's level, and the logger's level does not change an appender's threshold. Both must pass.
- Time is passed in, never read from a clock.
- Return values must be exactly the types above.
