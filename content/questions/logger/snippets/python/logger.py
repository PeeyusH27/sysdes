import threading
import time
from typing import Callable, Dict, List, Optional, Union

from models import Level, Record


class Logger:
    def __init__(self, name: str, parent: "Optional[Logger]", now: Callable[[], int]):
        self.name, self.parent, self._now = name, parent, now
        self.level: Optional[Level] = None  # None means "ask my parent"
        # Replaced on every add, never edited: a call in flight keeps the list it started with.
        self._appenders: List = []
        self._lock = threading.Lock()

    @property
    def effective_level(self) -> Level:
        node = self
        while node.level is None:  # the root always has a level, so this stops
            node = node.parent
        return node.level

    def is_enabled(self, level: Level) -> bool:
        return level >= self.effective_level

    def add_appender(self, appender) -> None:
        with self._lock:
            self._appenders = self._appenders + [appender]

    def log(self, level: Level, message: Union[str, Callable[[], str]]) -> int:
        """Returns how many appenders wrote the event. A message may be a function, built only if the level is on."""
        if not self.is_enabled(level):
            return 0  # the cheap path: no string built, no record allocated
        record = Record(self._now(), level, self.name, message() if callable(message) else message)
        written = 0
        node: Optional[Logger] = self
        while node is not None:  # an event also reaches every ancestor's appenders
            for appender in node._appenders:
                try:
                    if appender.append(record):
                        written += 1
                except Exception:
                    pass  # a broken appender must not silence the others
            node = node.parent
        return written


class LogManager:
    """Injected, not a global: tests build their own. A shared default instance is a convenience on top."""

    def __init__(self, now: Callable[[], int] = lambda: int(time.time() * 1000), root_level: Level = Level.INFO):
        self._now = now
        self.root = Logger("root", None, now)
        self.root.level = root_level
        self._loggers: Dict[str, Logger] = {"root": self.root}
        self._lock = threading.RLock()

    def get_logger(self, name: str) -> Logger:
        with self._lock:
            if name not in self._loggers:
                head, dot, _ = name.rpartition(".")
                parent = self.get_logger(head) if dot else self.root  # "app.db" hangs under "app"
                self._loggers[name] = Logger(name, parent, self._now)
            return self._loggers[name]
