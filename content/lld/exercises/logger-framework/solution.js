const RANK = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

// Strategy: a format is a function from a record to a line. A new format is one new entry here.
const FORMATS = {
  plain: (r) => `${r.time} ${r.level} ${r.logger} - ${r.message}`,
  json: (r) => JSON.stringify({ time: r.time, level: r.level, logger: r.logger, message: r.message }),
};

class LogManager {
  constructor() {
    this.levels = new Map([['root', 'INFO']]); // only loggers with their own level are stored
    this.attached = new Map(); // logger name -> appender names, in the order they were added
    this.appenders = new Map(); // appender name -> { threshold, format, lines }
  }

  // "a.b.c" -> "a.b" -> "a" -> "root". The tree is implied by the names, so there is nothing to keep in step.
  static parent(name) {
    if (name === 'root') return null;
    const cut = name.lastIndexOf('.');
    return cut < 0 ? 'root' : name.slice(0, cut);
  }

  setLevel(name, level) {
    if (level === 'INHERIT') {
      if (name === 'root') return false;
      this.levels.delete(name);
      return true;
    }
    if (!(level in RANK)) return false;
    this.levels.set(name, level);
    return true;
  }

  effectiveLevel(name) {
    for (let n = name; n; n = LogManager.parent(n)) if (this.levels.has(n)) return this.levels.get(n);
  }

  addAppender(appender, logger, threshold, format) {
    if (this.appenders.has(appender) || !(threshold in RANK) || !(format in FORMATS)) return false;
    this.appenders.set(appender, { threshold, format, lines: [] });
    if (!this.attached.has(logger)) this.attached.set(logger, []);
    this.attached.get(logger).push(appender);
    return true;
  }

  removeAppender(appender) {
    if (!this.appenders.delete(appender)) return false;
    for (const list of this.attached.values()) {
      const i = list.indexOf(appender);
      if (i >= 0) list.splice(i, 1);
    }
    return true;
  }

  log(logger, level, message, time) {
    if (!(level in RANK)) return -1;
    if (RANK[level] < RANK[this.effectiveLevel(logger)]) return 0; // the logger's bar, checked before any work
    const record = { time, level, logger, message };
    let written = 0;
    for (let n = logger; n; n = LogManager.parent(n)) {
      for (const name of this.attached.get(n) ?? []) {
        const a = this.appenders.get(name);
        if (RANK[level] < RANK[a.threshold]) continue; // the appender's own bar
        a.lines.push(FORMATS[a.format](record));
        written++;
      }
    }
    return written;
  }

  lines(appender) {
    return [...(this.appenders.get(appender)?.lines ?? [])];
  }
}
