import json as _json
import queue
import threading
from dataclasses import dataclass
from enum import IntEnum
from typing import Callable, Optional


class Level(IntEnum):  # an IntEnum compares by severity: INFO >= DEBUG
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40


@dataclass(frozen=True)
class Record:
    time: int
    level: Level
    logger: str
    message: str


# Strategy: how a record becomes a line. A new format is a new function, and nothing else changes.
def plain(r: Record) -> str:
    return f"{r.time} {r.level.name} {r.logger} - {r.message}"


def json(r: Record) -> str:
    return _json.dumps({"time": r.time, "level": r.level.name, "logger": r.logger, "message": r.message}, separators=(",", ":"))


class Appender:
    """Where lines go. The sink is a function, so a console, a file and a list all look alike."""

    def __init__(self, sink: Callable[[str], None], threshold: Level = Level.DEBUG, fmt: Callable[[Record], str] = plain):
        self.sink, self.threshold, self.fmt = sink, threshold, fmt
        self._lock = threading.Lock()  # two threads must not interleave their lines

    def append(self, record: Record) -> bool:
        if record.level < self.threshold:  # each appender has its own bar
            return False
        with self._lock:
            self.sink(self.fmt(record))
        return True


class AsyncAppender:
    """Decorator: a bounded queue and one worker thread, so callers never wait for slow I/O."""

    _STOP = object()

    def __init__(self, inner, capacity: int = 1000, block: bool = False):
        self._queue: "queue.Queue" = queue.Queue(maxsize=capacity)
        self._block = block
        self.dropped = 0
        self._lock = threading.Lock()
        self._worker = threading.Thread(target=self._run, args=(inner,), name="log-worker", daemon=True)
        self._worker.start()

    def _run(self, inner) -> None:
        while True:
            item = self._queue.get()
            if item is self._STOP:
                return
            inner.append(item)

    def append(self, record: Record) -> bool:
        if self._block:
            self._queue.put(record)  # back-pressure: slow the producer rather than lose events
            return True
        try:
            self._queue.put_nowait(record)
            return True
        except queue.Full:
            with self._lock:
                self.dropped += 1  # DROP: the newest event is lost, and counted
            return False

    def close(self) -> None:
        """Flush on shutdown: everything queued before the marker is written, then the worker ends."""
        self._queue.put(self._STOP)
        self._worker.join()
