class LogManager {
  constructor() {
    
  }

  /** Give a logger its own level, or "INHERIT" to remove it. @return {boolean} false for an unknown level, or INHERIT on "root" */
  setLevel(name, level) {
    
  }

  /** @return {string} the level that applies to this logger: its own, or the nearest ancestor's */
  effectiveLevel(name) {
    
  }

  /** Create a named appender on a logger. @return {boolean} false if the name is taken or the threshold or format is unknown */
  addAppender(appender, logger, threshold, format) {
    
  }

  /** @return {boolean} true if the appender existed */
  removeAppender(appender) {
    
  }

  /** @return {number} how many appenders wrote the record; 0 if the level is off; -1 for an unknown level */
  log(logger, level, message, time) {
    
  }

  /** @return {string[]} the lines this appender has written, oldest first */
  lines(appender) {
    
  }
}
