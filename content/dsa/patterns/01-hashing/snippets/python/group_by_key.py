# Template 4: group by a canonical key. Items that should end up together must map to the same key:
# a length, a sorted string, a count signature, an encoded coordinate...
from typing import Callable, Dict, Hashable, Iterable, List, TypeVar

T = TypeVar("T")


def group_by(items: Iterable[T], key_of: Callable[[T], Hashable]) -> List[List[T]]:
    groups: Dict[Hashable, List[T]] = {}   # key -> items with that key, in input order
    for item in items:
        groups.setdefault(key_of(item), []).append(item)
    return list(groups.values())
