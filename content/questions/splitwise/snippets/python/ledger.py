from typing import Dict, List, Tuple


class Ledger:
    """Who owes whom, netted per pair: if Ben owes Ana 500 and Ana then owes Ben 150, the ledger holds one fact,
    Ben owes Ana 350. Not thread-safe by itself: the Group holds the lock."""

    def __init__(self) -> None:
        self._owed: Dict[Tuple[str, str], int] = {}  # (from, to) -> cents; at most one direction per pair is non-zero

    def owes(self, source: str, to: str) -> int:
        return self._owed.get((source, to), 0)

    def add(self, debtor: str, creditor: str, cents: int) -> None:
        if debtor == creditor or cents == 0:
            return  # paying your own share creates no debt
        net = self.owes(debtor, creditor) + cents - self.owes(creditor, debtor)  # positive: the debtor owes the creditor
        self._owed[(creditor, debtor)] = max(0, -net)
        self._owed[(debtor, creditor)] = max(0, net)

    def settle(self, source: str, to: str, cents: int) -> bool:
        if not isinstance(cents, int) or cents <= 0 or cents > self.owes(source, to):
            return False  # never pay more than is owed
        self._owed[(source, to)] = self.owes(source, to) - cents
        return True

    def balances(self) -> Dict[str, int]:
        """Net per person: positive means the group owes them, negative means they owe the group. They add up to 0."""
        net: Dict[str, int] = {}
        for (source, to), cents in self._owed.items():
            net[source] = net.get(source, 0) - cents
            net[to] = net.get(to, 0) + cents
        return net

    def simplify(self) -> List[Tuple[str, str, int]]:
        """Greedy: the biggest debtor pays the biggest creditor. At most n - 1 transfers, because each one settles
        somebody. The true minimum is NP-hard (it is a subset-sum problem), and greedy is never worse than n - 1."""
        debtors = [[who, -n] for who, n in self.balances().items() if n < 0]
        creditors = [[who, n] for who, n in self.balances().items() if n > 0]
        biggest = lambda entry: (-entry[1], entry[0])  # ties by name, so the result is repeatable
        plan: List[Tuple[str, str, int]] = []
        while debtors and creditors:
            debtors.sort(key=biggest)
            creditors.sort(key=biggest)
            pay = min(debtors[0][1], creditors[0][1])
            plan.append((debtors[0][0], creditors[0][0], pay))
            debtors[0][1] -= pay
            creditors[0][1] -= pay
            if debtors[0][1] == 0:
                debtors.pop(0)
            if creditors[0][1] == 0:
                creditors.pop(0)
        return plan
