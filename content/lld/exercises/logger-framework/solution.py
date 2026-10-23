import json

RANK = {"DEBUG": 10, "INFO": 20, "WARN": 30, "ERROR": 40}


# Strategy: a format is a function from a record to a line. A new format is one new entry here.
def _plain(r):
    return f"{r['time']} {r['level']} {r['logger']} - {r['message']}"


def _json(r):
    return json.dumps({"time": r["time"], "level": r["level"], "logger": r["logger"], "message": r["message"]}, separators=(",", ":"))


FORMATS = {"plain": _plain, "json": _json}


class LogManager:
    def __init__(self):
        self.levels = {"root": "INFO"}  # only loggers with their own level are stored
        self.attached = {}  # logger name -> appender names, in the order they were added
        self.appenders = {}  # appender name -> {threshold, format, lines}

    @staticmethod
    def parent(name):
        """'a.b.c' -> 'a.b' -> 'a' -> 'root'. The tree is implied by the names, so there is nothing to keep in step."""
        if name == "root":
            return None
        head, dot, _ = name.rpartition(".")
        return head if dot else "root"

    def set_level(self, name, level):
        if level == "INHERIT":
            if name == "root":
                return False
            self.levels.pop(name, None)
            return True
        if level not in RANK:
            return False
        self.levels[name] = level
        return True

    def effective_level(self, name):
        n = name
        while n is not None:
            if n in self.levels:
                return self.levels[n]
            n = self.parent(n)

    def add_appender(self, appender, logger, threshold, format):
        if appender in self.appenders or threshold not in RANK or format not in FORMATS:
            return False
        self.appenders[appender] = {"threshold": threshold, "format": format, "lines": []}
        self.attached.setdefault(logger, []).append(appender)
        return True

    def remove_appender(self, appender):
        if appender not in self.appenders:
            return False
        del self.appenders[appender]
        for names in self.attached.values():
            if appender in names:
                names.remove(appender)
        return True

    def log(self, logger, level, message, time):
        if level not in RANK:
            return -1
        if RANK[level] < RANK[self.effective_level(logger)]:  # the logger's bar, checked before any work
            return 0
        record = {"time": time, "level": level, "logger": logger, "message": message}
        written = 0
        n = logger
        while n is not None:
            for name in self.attached.get(n, []):
                a = self.appenders[name]
                if RANK[level] < RANK[a["threshold"]]:  # the appender's own bar
                    continue
                a["lines"].append(FORMATS[a["format"]](record))
                written += 1
            n = self.parent(n)
        return written

    def lines(self, appender):
        a = self.appenders.get(appender)
        return list(a["lines"]) if a else []
