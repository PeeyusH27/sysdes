import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

enum Level { DEBUG, INFO, WARN, ERROR }  // declared in order, so compareTo is the severity comparison

record LogRecord(long time, Level level, String logger, String message) {}

// Strategy: how a record becomes a line. A new format is a new lambda, and nothing else changes.
interface Formatter {
    String format(LogRecord r);

    Formatter PLAIN = r -> r.time() + " " + r.level() + " " + r.logger() + " - " + r.message();
    Formatter JSON = r -> "{\"time\":" + r.time() + ",\"level\":\"" + r.level() + "\",\"logger\":\"" + escape(r.logger())
            + "\",\"message\":\"" + escape(r.message()) + "\"}";

    private static String escape(String s) { return s.replace("\\", "\\\\").replace("\"", "\\\""); }
}

// An appender is where lines go. Console, file and list all look alike to the logger.
interface Appender {
    boolean append(LogRecord record);  // true if this appender wrote the record
}

final class SinkAppender implements Appender {
    private final Consumer<String> sink;
    private final Level threshold;
    private final Formatter formatter;

    SinkAppender(Consumer<String> sink, Level threshold, Formatter formatter) {
        this.sink = sink;
        this.threshold = threshold;
        this.formatter = formatter;
    }

    SinkAppender(Consumer<String> sink) { this(sink, Level.DEBUG, Formatter.PLAIN); }

    // synchronized: two threads must not interleave their lines in a shared file or console
    @Override public synchronized boolean append(LogRecord record) {
        if (record.level().compareTo(threshold) < 0) return false;  // each appender has its own bar
        sink.accept(formatter.format(record));
        return true;
    }
}

enum Overflow { DROP, BLOCK }

// Decorator: a bounded queue and one worker thread, so callers never wait for slow I/O.
final class AsyncAppender implements Appender {
    private static final LogRecord STOP = new LogRecord(0, Level.ERROR, "", "");
    private final BlockingQueue<LogRecord> queue;
    private final Overflow overflow;
    private final AtomicLong dropped = new AtomicLong();
    private final Thread worker;

    AsyncAppender(Appender inner, int capacity, Overflow overflow) {
        this.queue = new ArrayBlockingQueue<>(capacity);
        this.overflow = overflow;
        this.worker = new Thread(() -> {
            try {
                for (LogRecord r = queue.take(); r != STOP; r = queue.take()) inner.append(r);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "log-worker");
        worker.setDaemon(true);
        worker.start();
    }

    @Override public boolean append(LogRecord record) {
        try {
            if (overflow == Overflow.BLOCK) {
                queue.put(record);  // back-pressure: slow the producer rather than lose events
                return true;
            }
            if (queue.offer(record)) return true;
            dropped.incrementAndGet();  // DROP: the newest event is lost, and counted
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    long dropped() { return dropped.get(); }

    // Flush on shutdown: everything queued before the marker is written, then the worker ends.
    void close() throws InterruptedException {
        queue.put(STOP);
        worker.join();
    }
}
