import { Level } from './models.js';

export class Logger {
  constructor(name, parent, now) {
    Object.assign(this, { name, parent, now });
    this.level = null;        // null means "ask my parent"
    this.appenders = [];      // replaced on every add, never edited: a call in flight keeps the list it started with
  }

  get effectiveLevel() {
    let l = this;
    while (l.level === null) l = l.parent;   // the root always has a level, so this stops
    return l.level;
  }

  isEnabled(level) { return level >= this.effectiveLevel; }
  addAppender(appender) { this.appenders = [...this.appenders, appender]; }

  // Returns how many appenders wrote the event. A message may be a function, built only if the level is on.
  log(level, message) {
    if (!this.isEnabled(level)) return 0;        // the cheap path: no string built, no record allocated
    const record = { time: this.now(), level, logger: this.name, message: typeof message === 'function' ? message() : message };
    let written = 0;
    for (let l = this; l; l = l.parent) {        // an event also reaches every ancestor's appenders
      for (const a of l.appenders) {
        try { if (a.append(record)) written++; } catch { /* a broken appender must not silence the others */ }
      }
    }
    return written;
  }
}

// Injected, not a global: tests build their own. A shared default instance is a convenience on top.
export class LogManager {
  constructor({ now = Date.now, rootLevel = Level.INFO } = {}) {
    this.now = now;
    this.root = new Logger('root', null, now);
    this.root.level = rootLevel;
    this.loggers = new Map([['root', this.root]]);
  }

  getLogger(name) {
    if (!this.loggers.has(name)) {
      const cut = name.lastIndexOf('.');
      const parent = cut < 0 ? this.root : this.getLogger(name.slice(0, cut));   // "app.db" hangs under "app"
      this.loggers.set(name, new Logger(name, parent, this.now));
    }
    return this.loggers.get(name);
  }
}
