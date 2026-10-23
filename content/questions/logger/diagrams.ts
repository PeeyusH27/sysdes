import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "logger-classes",
  title: "Logging framework class diagram",
  description:
    "LogManager hands out named Loggers in a tree. A Logger has an optional Level, creates a Record for each enabled call, and hands it to its Appenders and then to its parent's. Appenders turn a record into a line with a swappable Formatter, an AsyncAppender wraps any appender with a bounded queue, and the Clock is injected.",
  classes: [
    { id: "manager", name: "LogManager", col: 0, row: 0, fields: ["root: Logger", "loggers: Map<name, Logger>"], methods: ["getLogger(name)"] },
    { id: "level", name: "Level", col: 1, row: 0, fields: ["DEBUG < INFO < WARN < ERROR"] },
    { id: "sink", name: "SinkAppender", col: 2, row: 0, fields: ["sink: line consumer", "threshold: Level"], methods: ["append(record)"] },
    { id: "async", name: "AsyncAppender", col: 3, row: 0, fields: ["queue: bounded", "overflow: DROP | BLOCK", "dropped: count"], methods: ["append(record)", "close(): flush"] },

    { id: "clock", name: "Clock", col: 0, row: 1, stereotype: "interface", methods: ["now(): ms"] },
    {
      id: "logger",
      name: "Logger",
      col: 1,
      row: 1,
      fields: ["name: 'app.db'", "level: Level or null", "parent: Logger", "appenders: copy-on-write list"],
      methods: ["log(level, message)", "isEnabled(level)", "addAppender(a)"],
    },
    { id: "appender", name: "Appender", col: 2, row: 1, stereotype: "interface", methods: ["append(record): boolean"] },
    { id: "formatter", name: "Formatter", col: 3, row: 1, stereotype: "interface", methods: ["format(record): line"] },

    { id: "record", name: "Record", col: 1, row: 2, fields: ["time", "level", "logger name", "message"] },
    { id: "json", name: "JsonFormatter", col: 3, row: 2, fields: ["also: PlainFormatter"], methods: ["format(record)"] },
  ],
  relations: [
    { from: "manager", to: "logger", type: "composition", label: "by name" },
    { from: "logger", to: "level", type: "association", label: "threshold" },
    { from: "logger", to: "record", type: "dependency", label: "creates" },
    { from: "logger", to: "appender", type: "composition", label: "0..*" },
    { from: "sink", to: "appender", type: "implements" },
    { from: "async", to: "appender", type: "implements" },
    { from: "async", to: "appender", type: "aggregation", label: "wraps one" },
    { from: "sink", to: "formatter", type: "association", label: "uses" },
    { from: "json", to: "formatter", type: "implements" },
    { from: "logger", to: "clock", type: "dependency", label: "timestamp" },
  ],
  stages: [
    { title: "Named loggers with a level", note: "A manager hands out one Logger per name. Each call becomes a Record, and a level decides whether the call matters at all.", add: ["manager", "logger", "level", "record"] },
    { title: "Appenders are where lines go", note: "A Logger does not write anywhere itself. It hands the Record to its Appenders, each with its own threshold, so one event can reach a console and a file.", add: ["appender", "sink"] },
    { title: "Format is a strategy", note: "How a record becomes a line is a Formatter. Plain text and JSON are two classes behind one method, and an appender can use either.", add: ["formatter", "json"] },
    { title: "Slow I/O gets a queue", note: "AsyncAppender wraps any appender in a bounded queue and a worker, so the caller never waits for a disk. The bound forces a choice: drop or block.", add: ["async"] },
    { title: "Time comes in from outside", note: "The Logger reads the time through a Clock, so tests assert whole lines without a real clock.", add: ["clock"] },
  ],
};

export const logFlow: SequenceSpec = {
  id: "logger-log-call",
  title: "logger.log(level, message) for the logger app.db",
  description:
    "The call first asks whether its level is on. If not, it returns at once with nothing built. If it is, the Logger builds one Record and walks up the tree: its own appenders first, then app, then the root. Each appender applies its own threshold and formatter.",
  actors: [
    { id: "caller", label: "Caller", kind: "client" },
    { id: "db", label: "app.db", kind: "service" },
    { id: "app", label: "app", kind: "service" },
    { id: "console", label: "Console", kind: "worker" },
    { id: "file", label: "File", kind: "storage" },
  ],
  items: [
    { from: "caller", to: "db", label: "log(level, supplier)" },
    { note: "level null: ask app, which says WARN", over: ["db", "app"] },
    {
      alt: [
        {
          when: "level off",
          items: [
            { note: "call was DEBUG, below WARN: the supplier never runs", over: ["db", "app"] },
            { from: "db", to: "caller", label: "0 appenders wrote", type: "reply" },
          ],
        },
        {
          when: "level on",
          items: [
            { note: "call was ERROR, so it passes: build one Record with the clock", over: ["caller", "db"] },
            { from: "db", to: "console", label: "append(record)" },
            { from: "console", to: "db", label: "threshold INFO: written", type: "reply" },
            { from: "db", to: "app", label: "pass to the parent" },
            { from: "app", to: "file", label: "append(record)" },
            { from: "file", to: "app", label: "threshold ERROR: written", type: "reply" },
            { from: "db", to: "caller", label: "2 appenders wrote", type: "reply" },
          ],
        },
        {
          when: "one appender throws",
          items: [
            { from: "db", to: "console", label: "append(record)" },
            { note: "exception caught here: the next appender still runs", over: ["db", "console"] },
            { from: "db", to: "app", label: "pass to the parent" },
            { from: "app", to: "file", label: "append(record)" },
            { from: "db", to: "caller", label: "1 appender wrote", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const asyncFlow: SequenceSpec = {
  id: "logger-async-append",
  title: "AsyncAppender: the caller and the worker",
  description:
    "The caller puts the record on a bounded queue and goes on. A single worker thread takes records in order and passes them to the real appender. When the queue is full the overflow policy decides: DROP loses the newest record and counts it, BLOCK makes the caller wait.",
  actors: [
    { id: "caller", label: "Caller", kind: "client" },
    { id: "async", label: "AsyncAppender", kind: "service" },
    { id: "queue", label: "Bounded queue", kind: "queue" },
    { id: "worker", label: "Worker", kind: "worker" },
    { id: "file", label: "File", kind: "storage" },
  ],
  items: [
    { from: "caller", to: "async", label: "append(record)" },
    {
      alt: [
        {
          when: "room in the queue",
          items: [
            { from: "async", to: "queue", label: "offer(record)" },
            { from: "async", to: "caller", label: "true, returns at once", type: "reply" },
            { from: "queue", to: "worker", label: "take()", type: "async" },
            { from: "worker", to: "file", label: "append(record)" },
          ],
        },
        {
          when: "full, DROP",
          items: [
            { from: "async", to: "queue", label: "offer(record) fails" },
            { note: "dropped counter + 1: the newest event is lost", over: ["async", "queue"] },
            { from: "async", to: "caller", label: "false, returns at once", type: "reply" },
          ],
        },
        {
          when: "full, BLOCK",
          items: [
            { from: "async", to: "queue", label: "put(record) waits" },
            { from: "worker", to: "file", label: "writes one, queue frees a slot" },
            { from: "queue", to: "async", label: "accepted", type: "reply" },
            { from: "async", to: "caller", label: "true, after the wait", type: "reply" },
          ],
        },
        {
          when: "shutdown",
          items: [
            { from: "caller", to: "async", label: "close()" },
            { from: "async", to: "queue", label: "put(STOP marker)" },
            { from: "worker", to: "file", label: "drains every record before the marker" },
            { from: "worker", to: "async", label: "ends, join returns", type: "reply" },
          ],
        },
      ],
    },
  ],
};
