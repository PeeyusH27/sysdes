import math
from typing import List, Mapping, Optional, Sequence

from models import COINS


def greedy_change(amount: int, counts: Mapping[int, int], denoms: Sequence[int] = COINS) -> Optional[List[int]]:
    """Greedy: take the largest coin that fits, repeat. With unlimited coins of a canonical system like
    100/25/10/5 this is optimal. With LIMITED tubes it never backtracks, so it can fail even when change
    exists: owe 30¢ from one 25¢ and three 10¢, it takes the 25¢ and then needs a 5¢."""
    coins: List[int] = []
    for d in denoms:
        n = min(counts.get(d, 0), amount // d)
        amount -= n * d
        coins += [d] * n
    return coins if amount == 0 else None


def make_change(amount: int, counts: Mapping[int, int], denoms: Sequence[int] = COINS) -> Optional[List[int]]:
    """Bounded DP: the fewest coins that pay `amount` exactly, using at most counts[d] of each coin.
    Work is denominations × amount × coins per tube: microseconds for a vending machine."""
    best = [0] + [math.inf] * amount  # best[a]: fewest coins for a, denominations so far
    used: List[List[int]] = []  # used[i][a]: how many denoms[i] that best way uses
    for d in denoms:
        nxt = [math.inf] * (amount + 1)
        pick = [0] * (amount + 1)
        for a in range(amount + 1):
            j = 0
            while j <= counts.get(d, 0) and j * d <= a:
                if best[a - j * d] + j < nxt[a]:
                    nxt[a] = best[a - j * d] + j
                    pick[a] = j
                j += 1
        used.append(pick)
        best = nxt
    if best[amount] == math.inf:
        return None  # impossible: refuse the sale and refund
    coins: List[int] = []
    a = amount
    for i in range(len(denoms) - 1, -1, -1):  # walk back through the choices
        coins += [denoms[i]] * used[i][a]
        a -= used[i][a] * denoms[i]
    return sorted(coins, reverse=True)
