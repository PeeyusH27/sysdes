import threading
import time
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Dict, Generic, Hashable, List, Optional, Tuple, TypeVar

from policies import EvictionPolicy, LruPolicy

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")


class Removal(Enum):
    EVICTED = "evicted"
    EXPIRED = "expired"
    DELETED = "deleted"


@dataclass
class Stats:
    hits: int = 0
    misses: int = 0
    evictions: int = 0


class Cache(Generic[K, V]):
    def __init__(self, capacity: int, policy: Optional[EvictionPolicy[K]] = None, ttl_ms: float = float("inf"),
                 now: Callable[[], float] = lambda: time.time() * 1000):
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._policy: EvictionPolicy[K] = policy or LruPolicy()
        self._ttl = ttl_ms
        self._now = now  # injected, so tests and TTL logic never read the real clock
        self._entries: Dict[K, Tuple[V, float]] = {}  # key -> (value, expires_at)
        self._listeners: List[Callable[[K, V, Removal], None]] = []
        self._stats = Stats()
        # One lock for everything: get() also changes the order, so even reads need exclusive access.
        self._lock = threading.Lock()

    def on_remove(self, listener: Callable[[K, V, Removal], None]) -> None:  # observer
        self._listeners.append(listener)

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)

    @property
    def stats(self) -> Stats:
        with self._lock:
            return Stats(self._stats.hits, self._stats.misses, self._stats.evictions)

    def get(self, key: K, default: Optional[V] = None) -> Optional[V]:
        gone: List[Tuple[K, V, Removal]] = []
        with self._lock:
            entry = self._entries.get(key)
            if entry is not None and entry[1] <= self._now():  # lazy expiry
                self._remove(key, Removal.EXPIRED, gone)
                entry = None
            if entry is None:
                self._stats.misses += 1
                result = default
            else:
                self._policy.on_access(key)
                self._stats.hits += 1
                result = entry[0]
        self._fire(gone)  # listeners run outside the lock, so a slow one cannot block or deadlock the cache
        return result

    def put(self, key: K, value: V, ttl_ms: Optional[float] = None) -> None:
        gone: List[Tuple[K, V, Removal]] = []
        with self._lock:
            ttl = self._ttl if ttl_ms is None else ttl_ms
            entry = (value, self._now() + ttl)
            if key in self._entries:
                self._entries[key] = entry
                self._policy.on_access(key)
            else:
                if len(self._entries) >= self.capacity:
                    self._remove(self._policy.victim(), Removal.EVICTED, gone)
                self._entries[key] = entry
                self._policy.on_insert(key)
        self._fire(gone)

    def delete(self, key: K) -> bool:
        gone: List[Tuple[K, V, Removal]] = []
        with self._lock:
            if key not in self._entries:
                return False
            self._remove(key, Removal.DELETED, gone)
        self._fire(gone)
        return True

    def _remove(self, key: K, why: Removal, gone: List[Tuple[K, V, Removal]]) -> None:  # caller holds the lock
        value, _ = self._entries.pop(key)
        self._policy.on_remove(key)
        if why is Removal.EVICTED:
            self._stats.evictions += 1
        gone.append((key, value, why))

    def _fire(self, gone: List[Tuple[K, V, Removal]]) -> None:
        for key, value, why in gone:
            for listener in self._listeners:
                listener(key, value, why)
