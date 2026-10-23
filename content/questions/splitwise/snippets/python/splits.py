from typing import Callable, Dict, List, Optional, Sequence

# Strategy: each split type turns (amount in cents, participants) into one share per participant, in order,
# or None when the input makes no sense. Money is integer cents, so 10.00 is 1000 and nothing is a float.
SplitFn = Callable[[int, Sequence[str], Sequence[int]], Optional[List[int]]]


def spread(amount: int, weights: Sequence[int]) -> List[int]:
    """Proportional split. Floors lose under one cent per person, so the leftover is fewer cents than people:
    hand them out one each to the first participants in the order given, so the same input always gives the same bill."""
    total = sum(weights)
    shares = [amount * w // total for w in weights]
    for i in range(amount - sum(shares)):
        shares[i] += 1
    return shares


def _ints(data: Sequence[int]) -> bool:
    return all(isinstance(x, int) and not isinstance(x, bool) for x in data)


def equal(amount: int, users: Sequence[str], data: Sequence[int] = ()) -> Optional[List[int]]:
    return spread(amount, [1] * len(users))


def shares(amount: int, users: Sequence[str], data: Sequence[int] = ()) -> Optional[List[int]]:
    ok = len(data) == len(users) and _ints(data) and all(w > 0 for w in data)
    return spread(amount, data) if ok else None


def percent(amount: int, users: Sequence[str], data: Sequence[int] = ()) -> Optional[List[int]]:
    ok = len(data) == len(users) and _ints(data) and all(p > 0 for p in data) and sum(data) == 100
    return spread(amount, data) if ok else None


def exact(amount: int, users: Sequence[str], data: Sequence[int] = ()) -> Optional[List[int]]:
    ok = len(data) == len(users) and _ints(data) and all(c >= 0 for c in data) and sum(data) == amount
    return list(data) if ok else None


SPLITS: Dict[str, SplitFn] = {"equal": equal, "shares": shares, "percent": percent, "exact": exact}
