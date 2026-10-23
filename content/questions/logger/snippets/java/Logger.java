import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

final class Logger {
    private final String name;
    private final Logger parent;
    private final LongSupplier clock;
    private volatile Level level;  // null means "ask my parent"
    // Copy on write: a call in flight iterates a snapshot, so adding an appender never breaks it.
    private final List<Appender> appenders = new CopyOnWriteArrayList<>();

    Logger(String name, Logger parent, LongSupplier clock) {
        this.name = name;
        this.parent = parent;
        this.clock = clock;
    }

    void setLevel(Level level) { this.level = level; }
    void addAppender(Appender appender) { appenders.add(appender); }

    Level effectiveLevel() {
        Logger l = this;
        while (l.level == null) l = l.parent;  // the root always has a level, so this stops
        return l.level;
    }

    boolean isEnabled(Level wanted) { return wanted.compareTo(effectiveLevel()) >= 0; }

    int log(Level wanted, String message) { return log(wanted, () -> message); }

    // Returns how many appenders wrote the event. The message is built only if the level is on.
    int log(Level wanted, Supplier<String> message) {
        if (!isEnabled(wanted)) return 0;  // the cheap path: no string built, no record allocated
        LogRecord record = new LogRecord(clock.getAsLong(), wanted, name, message.get());
        int written = 0;
        for (Logger l = this; l != null; l = l.parent) {  // an event also reaches every ancestor's appenders
            for (Appender a : l.appenders) {
                try {
                    if (a.append(record)) written++;
                } catch (RuntimeException e) {
                    // a broken appender must not silence the others
                }
            }
        }
        return written;
    }
}

// Injected, not a global: tests build their own. A shared default instance is a convenience on top.
final class LogManager {
    private final LongSupplier clock;
    private final Logger root;
    private final Map<String, Logger> loggers = new ConcurrentHashMap<>();

    LogManager(LongSupplier clock, Level rootLevel) {
        this.clock = clock;
        this.root = new Logger("root", null, clock);
        this.root.setLevel(rootLevel);
        loggers.put("root", root);
    }

    Logger root() { return root; }

    Logger getLogger(String name) {
        Logger found = loggers.get(name);
        if (found != null) return found;
        int cut = name.lastIndexOf('.');
        Logger parent = cut < 0 ? root : getLogger(name.substring(0, cut));  // "app.db" hangs under "app"
        return loggers.computeIfAbsent(name, n -> new Logger(n, parent, clock));
    }
}
